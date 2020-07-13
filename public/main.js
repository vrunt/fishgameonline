/* global io */

$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    "#e21400",
    "#91580f",
    "#f8a700",
    "#f78b00",
    "#58dc00",
    "#287b00",
    "#a8f07a",
    "#4ae8c4",
    "#3b88eb",
    "#3824aa",
    "#a700ff",
    "#d300e7"
  ];

  //var suits = {
  //  Squids:
  //    "https://cdn.glitch.com/e492685b-d3fe-4216-ad30-384210bb8b59%2FFood-seafood-squid-sea-512.png?v=1578811175663",
  //  Whales:
  //    "https://cdn.glitch.com/e492685b-d3fe-4216-ad30-384210bb8b59%2F004_004_whale_sea_ocean_animal_fountain-512.png?v=1578811176411",
  //  Turtles:
  //    "https://cdn.glitch.com/e492685b-d3fe-4216-ad30-384210bb8b59%2Fgreen-sea-turtle-icon-green-turtle.jpg?v=1578811167365",
  //  Hooks:
  //    "https://cdn.glitch.com/e492685b-d3fe-4216-ad30-384210bb8b59%2Fhook-icon-4.png?v=1578811165171"
  //};

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $(".usernameInput"); // Input for username
  var $messages = $(".messages"); // Messages area
  var $inputMessage = $(".inputMessage"); // Input message input box
  var $users = $(".users"); // user list
  var $gamelog = $(".gamelog"); //game log

  var $deck = $(".deck");
  var $hand = $(".hand");

  var $loginPage = $(".login.page"); // The login page
  var $chatPage = $(".chat.page"); // The chatroom page
  var $gamePage = $(".game.page"); // game page

  // Prompt for setting a username
  var username;
  var uid;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  function addParticipantsMessage(data) {
    var message = "";
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername() {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $gamePage.show();
      $loginPage.off("click");
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit("add user", username);
    }
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val("");
      if (message.charAt(0) == "/") {
        socket.emit("new command", message);
      } else {
        addChatMessage({
          username: username,
          uid: uid,
          time: Date.now(),
          message: message
        });
        // tell server to execute 'new message' and send along one parameter
        socket.emit("new message", message);
      }
    }
  }

  // Log a message
  function log(message, options) {
    var $el = $("<li>")
      .addClass("log")
      .text(message);
    addMessageElement($el, options);
  }

  function addChatCommand(data) {
    var $commandDiv = $('<li class="command">').text(
      "[" +
        data.username +
        "] " +
        data.command +
        " (" +
        data.args.join(", ") +
        ")"
    );
    $gamelog.append($commandDiv);
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    //var $usernameDiv = $('<span class="username" title="' + new Date(data.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit'}) + '"/>')
    var $usernameDiv = $('<span class="username" />')
      .text(data.username)
      .css("color", getUsernameColor(data.uid, data.old));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message)
      .css("color", data.old ? "#7f7f7f" : "#000000");

    var typingClass = data.typing ? "typing" : "";
    var $messageDiv = $('<li class="message"/>')
      .data("username", data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = "is typing";
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function() {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === "undefined") {
      options.fade = true;
    }
    if (typeof options.prepend === "undefined") {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function addUserToList(data) {
    var $usernameLi = $('<li class="username" id="' + data.uid + '"/>')
      .text(data.username)
      .css("color", getUsernameColor(data.uid));
    $users.append($usernameLi);
  }

  function populateUsersList(data) {
    for (var key in data.userList) {
      addUserToList({
        uid: data.userList[key].slice(0, data.userList[key].indexOf("|")),
        username: data.userList[key].slice(data.userList[key].indexOf("|") + 1)
      });
    }
  }

  function removeUserFromList(data) {
    var $leaver = $("#" + data.uid);
    $leaver.remove();
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $("<div/>")
      .text(input)
      .text();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit("typing");
      }
      lastTypingTime = new Date().getTime();

      setTimeout(function() {
        var typingTimer = new Date().getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit("stop typing");
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $(".typing.message").filter(function(i) {
      return $(this).data("username") === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(uid, faded) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    if (faded) {
      //return "#" + (("0x"+COLORS[index].substring(1))/2).toString(16);
      return (
        "#" +
        Math.floor(
          (parseInt("0x" + COLORS[index].substring(1)) + 16777215) / 2
        ).toString(16)
      );
    }
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function(event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit("stop typing");
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on("input", function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function() {
    $currentInput.focus();
  });

  $deck.click(function() {
    log("Deck clicked.");
    socket.emit("deck click");
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function() {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on("login", function(data) {
    connected = true;
    uid = data.uid;
    // Display the welcome message
    var message = "Welcome to Fish Game Online – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
    populateUsersList(data);
    var $newcard = $(
      '<li><svg><use xlink:href="images.svg#cardback"></use></svg></li>'
    );
    $deck.append($newcard);
    var $newcard2 = $(
      '<li><svg><use xlink:href="images.svg#cardback"></use></svg></li>'
    );
    $deck.append($newcard2);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on("new message", function(data) {
    addChatMessage(data);
  });

  socket.on("new command", function(data) {
    addChatCommand(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on("user joined", function(data) {
    log(data.username + " joined");
    addParticipantsMessage(data);
    addUserToList(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on("user left", function(data) {
    log(data.username + " left");
    addParticipantsMessage(data);
    removeChatTyping(data);
    removeUserFromList(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on("typing", function(data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on("stop typing", function(data) {
    removeChatTyping(data);
  });

  socket.on("new card", function(data) {
    log(data.cardname + " card received.");
    $gamelog.append($('<li id="' + data.cardid + '">' + data.cardname + "</li>"));
    //$hand.html("<img class='hand' src='" + suits[data.carddesc.split(' ')[4]] + "'>");
  });

  socket.on("disconnect", function(data) {
    //socket.open();
    location.reload();
  });
});
