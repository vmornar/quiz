var ws = {};
ws.connected = false;
var l;

window.onload = function() {
  l = window.location.toString();
  if (!l.includes(":8080")) {
    l = l.replace("/quiz", ":8080/quiz");
  }
  document.getElementById("quizId").value = localStorage.getItem("quizId");
  document.getElementById("userId").value = localStorage.getItem("userId");
  connect();
};

function displayMessage (msg, msgClass) {
  document.getElementById("message").innerHTML = msg;
  document.getElementById("message").className = msgClass;
}

function socketClosed() {
  ws.connected = false;
  displayMessage ("No connection, join again", "error");
}

function connect(callback) {
  if (ws.connected) {
    console.log (callback);
    if (callback != null) callback();
    return;
  }
  displayMessage ("Connecting...", "status");
  ws = new WebSocket(l.replace("http://", "ws://"));
  ws.onopen = function() {
    ws.connected = true;
    displayMessage ("Connected", "status");
    if (callback != null) callback();
  }
  ws.onmessage = function(msg) {
    var o = JSON.parse(msg.data);
    if (o.cmd == "Message") {
      displayMessage (o.message, o.class);
    }
  }
  ws.onclose = function() {
    socketClosed();
  }
  ws.onerror = function() {
    socketClosed();
  }
}

function sendAnswer(button) {
  ws.send(JSON.stringify({
    cmd: "Answer",
    answer: button.innerHTML
  }));
}

function sendText() {
  ws.send(JSON.stringify({
    cmd: "Answer",
    answer: document.getElementById("textToSend").value.replace(";", "|")
  }));
}

function join() {
  connect(function() {
    ws.send(JSON.stringify({
      cmd: "JoinQuiz",
      quizId: document.getElementById("quizId").value.trim(),
      userId: document.getElementById("userId").value.trim()
    }));

    localStorage.setItem("quizId", document.getElementById("quizId").value);
    localStorage.setItem("userId", document.getElementById("userId").value);
  });
}

function joinAnon() {
  connect(function() {
    ws.send(JSON.stringify({
      cmd: "JoinQuiz",
      quizId: document.getElementById("quizId").value.trim(),
      userId: ""
    }));
  });
}