// Setup basic express server
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var crypto = require("crypto");
var port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static("public"));

// init sqlite db
const fs = require("fs");
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Messages (id INTEGER PRIMARY KEY AUTOINCREMENT, time INTEGER, uid TEXT, username TEXT, message TEXT)"
    );
    console.log("New table Messages created!");
  } else {
    console.log('Database "Messages" ready to go!');
    // db.each("SELECT * FROM (SELECT * FROM Messages ORDER BY id DESC LIMIT 20) ORDER BY id ASC", (err, row) => {
    //  if (row) {
    //    console.log(`record: ${row.message}`);
    //  }
    //});
  }
});

// Chatroom

var numUsers = 0;
var userList = [];
var deck = [];

console.log("init");

io.on("connection", function(socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on("new message", function(data) {
    // we tell the client to execute 'new message'
    var timestamp = Date.now();
    db.serialize(() => {
      db.run(
        "INSERT INTO Messages (time, uid, username, message) VALUES (" +
          timestamp +
          ', "' +
          socket.uid +
          '", "' +
          socket.username +
          '", "' +
          data +
          '")'
      );
    });
    socket.broadcast.emit("new message", {
      username: socket.username,
      uid: socket.uid,
      time: timestamp,
      message: data
    });
  });

  socket.on("new command", function(data) {
    // we tell the client to execute 'new command'
    var cmdargs = data.split(" ");
    if (cmdargs[0] == "/shuffle") {
      deck = [];
      db.each("SELECT id FROM Cards ORDER BY RANDOM() LIMIT 10", (err, row) => {
        if (row) {
          deck.push(row.id);
        }
      });
    }
    io.emit("new command", {
      username: socket.username,
      uid: socket.uid,
      command: cmdargs.shift(),
      args: cmdargs
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on("add user", function(username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.uid = crypto.randomBytes(6).toString("hex");
    console.log(
      "user " +
        socket.id +
        " joined (UID: " +
        socket.uid +
        ", " +
        socket.username +
        ")"
    );
    ++numUsers;
    addedUser = true;
    userList.push(socket.uid + "|" + socket.username);

    var history = [];
    db.each(
      "SELECT * FROM (SELECT * FROM Messages ORDER BY id DESC LIMIT 20) ORDER BY id ASC",
      (err, row) => {
        if (row) {
          socket.emit("new message", {
            username: row.username,
            uid: row.uid,
            time: row.time,
            message: row.message,
            old: true
          });
        }
      }
    );

    socket.emit("login", {
      numUsers: numUsers,
      uid: socket.uid,
      userList: userList
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit("user joined", {
      username: socket.username,
      uid: socket.uid,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", function() {
    socket.broadcast.emit("typing", {
      username: socket.username,
      uid: socket.uid
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", function() {
    socket.broadcast.emit("stop typing", {
      username: socket.username,
      uid: socket.uid
    });
  });

  socket.on("deck click", function() {
    console.log(socket.username + " clicked the deck.");
    db.each(
      "SELECT * FROM Cards WHERE id=" + deck.pop() + " LIMIT 1",
      (err, row) => {
        if (row) {
          console.log("Deck now has " + deck.length + " cards.");
          socket.emit("new card", {
            cardname: row.name,
            cardid: row.id,
            cardvalue: row.value,
            carddesc: row.description
          });
        }
      }
    );
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function() {
    if (addedUser) {
      --numUsers;
      console.log(
        "user " +
          socket.id +
          " left (UID: " +
          socket.uid +
          ", " +
          socket.username +
          ")"
      );
      userList = userList.filter(
        item => item !== socket.uid + "|" + socket.username
      );
      // echo globally that this client has left
      socket.broadcast.emit("user left", {
        username: socket.username,
        uid: socket.uid,
        numUsers: numUsers
      });
    }
  });
});
