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

  try {
    msg = ""
    if (ws.connected) {
      if (callback != null) callback();
      return;
    }
    msg = msg + " 1";
    displayMessage("Connecting...", "status");
    msg = msg + " 2";
    var l = window.location.toString();
    msg = msg + " 3";
     if (l.indexOf(":8080") < 0) {
       l = l.replace("/quiz", ":8080/quiz");
     }
    msg = msg + " 4";
	let address = l.replace("https://", "wss://");
	address = address.replace("http://", "ws://");
    ws = new WebSocket(address);
    msg = msg + " 5";
    ws.onopen = function() {
      ws.connected = true;
      ws.joined = false;
      displayMessage("Connected", "status");
      if (callback != null) callback();
    }

    ws.onmessage = onMessage;

    ws.onclose = socketClosed;

    ws.onerror = socketClosed;

    return;

  } catch(e) {
    alert (e.message + " " + msg);
  }
}