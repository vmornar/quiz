var ws = {};


ws.connected = false;
ws.joined = false;

WebSocket.prototype.sendJSON = function(o) {
  this.send(JSON.stringify(o));
}

function clearMessage() {
  displayMessage("", "status");
}

function checkJoined() {
  if (!ws.joined) {
    displayMessage("Please join a quiz", "error");
    return false;
  }
  return true;
}

function displayMessage(msg, msgClass) {
  document.getElementById("message").innerHTML = msg;
  document.getElementById("message").className = msgClass;
}

function socketClosed() {
  ws.connected = false;
  ws.joined = false;
  displayMessage("Not connected, please join again", "error");
}

function connect(callback) {

  if (ws.connected) {
    if (callback != null) callback();
    return;
  }

  displayMessage("Connecting...", "status");

  var l = window.location.toString();

  if (l.indexOf(":8080") < 0) {
    l = l.replace("/quiz", ":8080/quiz");
  }

  ws = new WebSocket(l.replace("http://", "ws://"));

  ws.onopen = function() {
    ws.connected = true;
    ws.joined = false;
    displayMessage("Connected", "status");
    if (callback != null) callback();
  }

  ws.onmessage = onMessage;

  ws.onclose = socketClosed;

  ws.onerror = socketClosed;

}