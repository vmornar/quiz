var express = require('express');
var app = express();
var ws = require('ws');
var http = require('http');
var request = require('request');
var router = express.Router();

ws.prototype.sendJSON = function sendJSON(o) {
  this.send(JSON.stringify(o));
}

var fs = require("fs");

const port = 8080;

var wsServer;
var userCounter = 0;
var params;
var quizzes = {};
var lecturers = {}; // because of circular reference if in quizzes

function saveQuiz(quizId) {
  var s = JSON.stringify(quizzes[quizId]);
  fs.writeFile("Storage/" + quizId + ".dat", s, function(err) {
    if (err) sendMessage(lecturers[quizId], err, "error");
  });
}

function loadQuiz(quizId) {
  try {
    var s = fs.readFileSync("Storage/" + quizId + ".dat");
    quizzes[quizId] = JSON.parse(s);
    return true;
  } catch (e) {
    return false;
  }
}

function closeQuiz(socket) {
  if (socket.quizId != null) {
    if (socket.lecturer) {
      delete quizzes[socket.quizId];
    } else {
      leaveQuiz(socket);
    }
  }
}

router.use(function(req, res, next) {
  if (!req.url.startsWith("/quiz")) req.url = "/quiz" + req.url;
  next();
});

router.get("/quiz", function(request, response) {
  response.sendFile(__dirname + "/quiz/index.html");
});

router.get("/quiz/lecturer", function(request, response) {
  response.sendFile(__dirname + "/quiz/indexLecturer.html");
});

router.get("/quiz/download", function(request, response) {
  var q = quizzes[request.query.quizId];

  if (q != null) {
    saveQuiz(q.quizId);
    var ret = ""
    for (var quest in q.answers) {
      for (var key in q.answers[quest]) {
        var a = q.answers[quest][key];
        ret += key + ";" + quest + ";" + a.answer + ";" + a.time + "\r\n"
      }
    }
    response.send(ret)
    response.end();
  }
});

app.use(express.static('quiz'));
app.use(express.static('.'));
app.use('/', router);

function checkUser(socket, o, joinQuiz) {
  // "0036377354"
  if (o.userId == "") {
    o.userId = "anon" + (++userCounter);
    joinQuiz(socket, o, o.userId, o.userId);
    // for testing purposes
  } else if (o.userId == "00000001") {
    joinQuiz(socket, o, o.userId, "Ante Antić");
  } else if (o.userId == "00000002") {
    joinQuiz(socket, o, o.userId, "Pero Perić");
  } else if (o.userId == "00000003") {
    joinQuiz(socket, o, o.userId, "Frane Franić");
  } else if (o.userId == "00000004") {
    joinQuiz(socket, o, o.userId, "Ivo Ivić");
  } else {
    // real authentication
    // serviceUrl: "https://some.site/someService?id=" returns ime, prezime
    request({
        url: params.serviceUrl + o.userId
      },
      function(error, response, body) {
        var resp = JSON.parse(body);
        if (resp.length > 0) {
          joinQuiz(socket, o, o.userId, resp[0].ime + " " + resp[0].prezime);
        } else {
          sendMessage(socket, "Unknown user", "error");
        }
      }
    );
  }
}


function joinQuiz(socket, o, userId, userName) {
  socket.userId = userId;
  q = quizzes[o.quizId];
  socket.quizId = o.quizId; // join new quiz
  if (q.users[userId] == null) { // if does not exist from before
    ++q.userCount;
    q.users[userId] = 1;
  } else {
    for (let client of wsServer.clients) {
      if (client.userId == userId && client != socket) {
        client.sendJSON({
          cmd: "Message",
          message: "Someone else joined quiz with this userId",
          class: "error"
        });
      }
    };
  }
  q.activeUserCount++;
  sendMessage(socket, "Joined quiz " + o.quizId + " as " + userName, "status");
  sendCounter(lecturers[o.quizId], "userCount", q.activeUserCount + "/" + q.userCount);
  lecturers[o.quizId].sendJSON({
    cmd: "User",
    userId: userId
  });
}

function leaveQuiz(user) {
  var q = quizzes[user.quizId];
  if (q != null) {
    --q.activeUserCount;
    //delete q.users[user.userId];
    sendCounter(lecturers[user.quizId], "userCount", q.activeUserCount + "/" + q.userCount);
    lecturers[q.quizId].sendJSON({
      cmd: "UserLeft",
      userId: user.userId
    });
    user.quizId = null;
    user.userId = null;
  }
}

function sendAnswers(q) {
  lecturers[q.quizId].sendJSON({
    cmd: "Answers",
    answers: q.answers[q.question]
  });
}

function sendCounter(socket, counter, value) {
  socket.sendJSON({
    cmd: "Count",
    counter: counter,
    value: value
  });
}

function sendMessage(socket, message, cssClass) {
  socket.sendJSON({
    cmd: "Message",
    message: message,
    class: cssClass
  });
}

function authenticated(socket) {
  return true;
  if (socket.authenticated) return true;
  sendMessage(socket, "Not authenticated", "error");
  return false;
}

var webServer = app.listen(port, function() {

  wsServer = new ws.Server({
    server: webServer
  });

  wsServer.on('connection', function(webSocket) {

    webSocket.lecturer = false;
    webSocket.authenticated = false;

    webSocket.on('message', function(message) {
      //console.log(message);
      try {
        var q;
        var o = JSON.parse(message);
        switch (o.cmd) {
          case "Auth":
            if (o.password == params.lecturerPwd) {
              this.authenticated = true
              this.sendJSON({
                cmd: "Auth"
              });
            } else {
              sendMessage(this, "Invalid password", "error");
              this.authenticated = false;
            }
          case "Answer":
            if (this.quizId != null) {
              let q = quizzes[this.quizId];
              if (q != null) {
                if (!q.active) {
                  sendMessage(this, "Quiz inactive", "error");
                  break;
                }
                let time = ((new Date()).getTime() - q.questionStart.getTime()) / 1000;
                if (q.question != null) {
                  if (q.answers[q.question][this.userId] == null) {
                    q.answerCount[q.question]++;
                  }
                  sendCounter(lecturers[q.quizId], "answerCount", q.answerCount[q.question]);
                  q.answers[q.question][this.userId] = {
                    answer: o.answer,
                    time: time
                  };
                  lecturers[q.quizId].sendJSON({
                    cmd: "Answer",
                    userId: this.userId,
                    answer: o.answer
                  });
                  sendMessage(this, "Answer " + o.answer + " to question " + q.question + ",  " + Math.floor(time) + " s", "status");
                }
              }
            }
            break;

          case "JoinQuizAsLecturer":
            if (!authenticated(this)) break;
            var q = quizzes[o.quizId];
            if (q == null) {
              if (!loadQuiz(o.quizId)) {
                sendMessage(this, "Quiz unavailable", "error");
                break;
              }
              q = quizzes[o.quizId];
              q.activeUserCount = 0;
            }
            lecturers[q.quizId] = this;
            this.quizId = o.quizId;
            this.lecturer = true;
            this.sendJSON({
              cmd: "OldQuizId",
              value: q.quizId,
              users: q.users
            });
            sendAnswers(q);
            sendCounter(this, "question", q.question);
            sendCounter(lecturers[o.quizId], "userCount", q.activeUserCount + "/" + q.userCount);
            sendCounter(this, "answerCount", q.answerCount[q.question]);
            q.active = false;
            q.questionStart = new Date();
            this.sendJSON({
              cmd: "Active",
              active: q.active
            });
            break;

          case "JoinQuiz":
            if (this.quizId != null && quizzes[this.quizId] != null) { // leave old quiz, if exists
              leaveQuiz(this);
            }
            if (quizzes[o.quizId] == null) {
              sendMessage(this, "Quiz unavailable", "error");
              break;
            }
            checkUser(this, o, joinQuiz);
            break;

          case "Active":
            if (!authenticated(this)) break;
            q = quizzes[this.quizId];
            if (q != null) {
              q.active = o.active;
              q.questionStart = new Date();
            }
            break;

          case "NextQuestion":
            if (!authenticated(this)) break;
            q = quizzes[this.quizId];
            if (q != null) {
              saveQuiz(this.quizId);
              q.question++;
              if (q.answerCount[q.question] == undefined) {
                q.answerCount[q.question] = 0;
                q.answers[q.question] = {};
                q.questionStart = new Date();
                q.active = true;
              } else {
                q.active = false;
              }
              this.sendJSON({
                cmd: "Active",
                active: q.active
              });
              sendCounter(this, "question", q.question);
              sendCounter(this, "answerCount", q.answerCount[q.question]);
              sendAnswers(q);
            }
            break;

          case "PrevQuestion":
            if (!authenticated(this)) break;
            q = quizzes[this.quizId];
            if (q.question > 1) {
              q.question--;
              q.active = false;
              sendCounter(this, "question", q.question);
              sendCounter(this, "answerCount", q.answerCount[q.question]);
              this.sendJSON({
                cmd: "Active",
                active: q.active
              });
            }
            sendAnswers(q);
            break;

          case "ClearQuiz":
            if (!authenticated(this)) break;
            q = quizzes[o.quizId];
            if (q == null) {
              sendMessage(this, "Quiz unavailable", "error");
            } else {
              delete quizzes[o.quizId];
            }
            this.quizId = null;
            break;

          case "NewQuiz":
            if (!authenticated(this)) break;
            if (this.quizId != null) {
              saveQuiz (this.quizId);
              delete quizzes[this.quizId];
            }
            var quizId;
            do {
              quizId = Math.floor((Math.random() * 10000) + 1).toString();
              //quizId = 1111;
            } while (quizzes[quizId] != null || fs.existsSync ("Storage/" + quizId + ".dat"));

            quizzes[quizId] = {
              quizId: quizId,
              question: 1,
              users: {},
              activeUserCount: 0,
              userCount: 0,
              answerCount: {},
              answers: {},
              questionStart: new Date(),
              quizStart: new Date(),
              active: true
            };
            lecturers[quizId] = this;
            var q = quizzes[quizId];
            q.answerCount[1] = 0;
            q.answers[1] = {};
            sendCounter(this, "question", q.question);
            this.quizId = quizId;
            this.lecturer = true;
            this.sendJSON({
              cmd: "QuizId",
              value: quizId
            });
            q.active = true;
            this.sendJSON({
              cmd: "Active",
              active: q.active
            });
            break;
        }
      } catch (err) {
        fs.appendFile("log.txt", err.message, function() {});
        sendMessage(this, err.message + "\r\n", "error");
      }

    });

    webSocket.on('error', function() {
      closeQuiz(this);
    });

    webSocket.on('close', function() {
      closeQuiz(this);
    });

  })
});


// destroy all quizzes lingering for more than 24 hours
function clean() {
  var t = new Date();
  for (var key in quizzes) {
    if (t - quizzes[key].quizStart > 24 * 3600 * 1000) {
      saveQuiz (key);
      delete quizzes[key];
    }
  }
}


// try {

  fs.appendFile("log.txt", "Started " + (new Date()).toString() + "\r\n");
  
  // in params
  // { serviceUrl: 'https://some.site/someService?p=',  lecturerPwd: 'password' }
  data = fs.readFileSync ("params");
  params = JSON.parse (data.toString());

  clean();
  setInterval(clean, 3600000)
// } catch (err) {
//   console.log (err.message);
//   fs.appendFile("log.txt", err.message + "\r\n", function() {});
// }



