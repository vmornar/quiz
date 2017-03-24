var ws;

window.onload = function () {

	var l = window.location.toString();
	ws = new WebSocket(l.replace("http://", "ws://"));

	ws.onmessage = function (msg) {
		var o = JSON.parse(msg.data);
		if (o.cmd == "Message") {
			document.getElementById("message").innerHTML = o.message;
			document.getElementById("message").className = o.class;
		}
	}

};

function sendAnswer (button) {
	ws.send (JSON.stringify({ cmd : "Answer", answer:button.innerHTML }));
}

function sendText () {
	ws.send (JSON.stringify({ cmd : "Answer", answer:document.getElementById("textToSend").value.replace(";","|") }));
}

function join () {
	ws.send (JSON.stringify({cmd : "JoinQuiz", 
		quizId : document.getElementById("quizId").value.trim(), 
		userId : document.getElementById("userId").value.trim() }));
}

function joinAnon () {
	ws.send (JSON.stringify({cmd : "JoinQuiz", 
		quizId : document.getElementById("quizId").value.trim(), 
		userId : "" }));
}

