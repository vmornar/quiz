var ws;

window.onload = function() {

  var l = window.location.toString();
  if (!l.includes(":8080")) {
    l = l.replace ("/quiz", ":8080/quiz");
  }
  ws = new WebSocket(l.replace("http://", "ws://"));
  document.getElementById("quizId").value = localStorage.getItem("quizId");
  document.getElementById("userId").value = localStorage.getItem("userId");

  ws.onmessage = function(msg) {
    var o = JSON.parse(msg.data);
    if (o.cmd == "Message") {
      document.getElementById("message").innerHTML = o.message;
      document.getElementById("message").className = o.class;
    }
  }

};

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
  ws.send(JSON.stringify({
    cmd: "JoinQuiz",
    quizId: document.getElementById("quizId").value.trim(),
    userId: document.getElementById("userId").value.trim()
  }));

  localStorage.setItem("quizId", document.getElementById("quizId").value);
  localStorage.setItem("userId", document.getElementById("userId").value);
}

function joinAnon() {
  ws.send(JSON.stringify({
    cmd: "JoinQuiz",
    quizId: document.getElementById("quizId").value.trim(),
    userId: ""
  }));
}