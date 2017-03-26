function onMessage(msg) {
  var o = JSON.parse(msg.data);
  if (o.cmd == "Message") {
    displayMessage(o.message, o.class);
    if (o.message.startsWith ("Joined")) ws.joined = true;
  }
}

window.onload = function() {
  document.getElementById("quizId").value = localStorage.getItem("quizId");
  document.getElementById("userId").value = localStorage.getItem("userId");
  connect();
};

function sendAnswer(button) {
  if (checkJoined()){
    ws.sendJSON({
      cmd: "Answer",
      answer: button.innerHTML
    });
  }
}

function sendText() {
  if (checkJoined()) {
    ws.sendJSON({
      cmd: "Answer",
      answer: document.getElementById("textToSend").value.replace(";", "|")
    });
  }
}

function join() {
  connect(function() {
    ws.sendJSON({
      cmd: "JoinQuiz",
      quizId: document.getElementById("quizId").value.trim(),
      userId: document.getElementById("userId").value.trim()
    });
    localStorage.setItem("quizId", document.getElementById("quizId").value);
    localStorage.setItem("userId", document.getElementById("userId").value);
  });
}

function joinAnon() {
  connect(function() {
    ws.sendJSON({
      cmd: "JoinQuiz",
      quizId: document.getElementById("quizId").value.trim(),
      userId: ""
    });
  });
}