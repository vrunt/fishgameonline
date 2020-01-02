// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var crypto = require('crypto');
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static('public'));

// Chatroom

var numUsers = 0;
var userList = [];

console.log('init');

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      uid: socket.uid,
      message: data
    });
  });
  
  socket.on('new command', function (data) {
  // we tell the client to execute 'new command'
  socket.broadcast.emit('new command', {
    username: socket.username,
    uid: socket.uid,
    command: data
  });
});

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.uid = crypto.randomBytes(6).toString('hex');
    console.log('user joined (UID: '+ socket.uid + ", " + socket.username + ')');
    ++numUsers;
    addedUser = true;
    userList.push (socket.uid + "|" + socket.username);
    socket.emit('login', {
      numUsers: numUsers,
      userList: userList
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      uid: socket.uid,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username,
      uid: socket.uid
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username,
      uid: socket.uid
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
      console.log('user left (UID: '+ socket.uid + ", " + socket.username + ')');
      userList = userList.filter(item => item !== socket.uid + '|' + socket.username);
      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        uid: socket.uid,
        numUsers: numUsers
      });
    }
  });
});