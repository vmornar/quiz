var active = true;
var mode = 1;
var myChart;
var seconds = 0;
var timerId;

function pad(n, size) {
  var s = "000000000" + n;
  return s.substr(s.length - size);
}

function updateTime() {
  $("#time").html(Math.floor(seconds / 60) + ":" + pad(seconds % 60, 2));
  seconds++;
}

function startTimer() {
  seconds = 0;
  if (timerId == null) {
    updateTime();
    timerId = setInterval(updateTime, 1000);
  }
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function setMode(inMode) {
  mode = inMode;
  if (mode < 3) {
    $("#chart").hide();
    $("#answers").show();
  } else {
    $("#chart").show();
    $("#answers").hide();
  }
}

function showAnswers() {
  if (mode < 3) showAnswersList(mode)
  else showAnswersGraph()
}

function addUser(userId) {
  if ($("#" + userId).length == 0) {
    $("#answers").append("<span id='" + userId + "' class='user'>" + userId + "</span>");
    $("#" + userId).data("active", true);
    $("#answers").children("span").each(function (idx, itm) {
      if ($(itm).attr("id") > userId) {
        $("#" + userId).insertBefore(itm);
        return;
      }
    });
  } else {
    $("#" + userId).data("active", true)
    $("#" + userId).removeClass("userInactive");
  }
}

function authenticate() {
  clearMessage();
  ws.sendJSON({
    cmd: "Auth",
    password: $("#password").val()
  })
}

function onMessage(msg) {
  var o = JSON.parse(msg.data);
  switch (o.cmd) {
    case "Blur":
      //$("#" + o.userId).data("active", false);
      $("#" + o.userId).addClass("blurred");
      break;
    case "Auth":
      $("#rest").show();
      $("#login").hide();
      $("#quizId").focus();
      break;
    case "QuizId":
      $("#quizId").val(o.value);
      $("#download").attr("download", o.value + ".txt");
      $("#download").attr("href", "/quiz/download?quizId=" + o.value);
      break;
    case "OldQuizId":
      $("#download").attr("download", o.value + ".txt");
      $("#download").attr("href", "/quiz/download?quizId=" + o.value);
      $("answers").html("");
      for (var userId in o.users) {
        addUser(userId);
        $("#" + userId).data("active", false);
        //$("#" + userId).addClass ("userInactive");
      }
      break;
    case "Count":
      $("#" + o.counter).html(o.value);
      break;
    case "Answer":
      $("#" + o.userId).data("answer", o.answer);
      //$("#" + o.userId)[0].className("user answered");
      $("#" + o.userId).addClass("answered");
      //if (mode == 3) showAnswersGraph();
      if (mode == 2) $("#" + o.userId).html(o.answer);
      break;
    case "Message":
      displayMessage(o.message, o.class);
      break;
    case "UserLeft":
      $("#" + o.userId).data("active", false);
      $("#" + o.userId).addClass("userInactive");
      break;
    case "User":
      addUser(o.userId);
      break;
    case "Answers":
      $("#answers").children("span").each(function (idx, itm) {
        $(itm).data("answer", "");
      });
      for (var key in o.answers) {
        $("#" + key).data("answer", o.answers[key].answer);
      }
      showAnswers();
      break;
    case "Active":
      toggle(o.active);
      break;
  }
}

$(document).ready(function () {
  connect();
});

function joinQuiz() {
  $("#time").html("");
  $("#answers").html("");
  connect(function () {
    ws.sendJSON({
      cmd: "JoinQuizAsLecturer",
      quizId: $("#quizId").val()
    });
  });
}

function clearQuiz() {
  ws.sendJSON({
    cmd: "ClearQuiz",
    quizId: $("#quizId").val()
  });
  $("#quizId").val("");
}

function newQuiz() {
  connect(function () {
    $("#userCount").html("0");
    $("#answerCount").html("0");
    $("#answers").html("");
    ws.sendJSON({
      cmd: "NewQuiz"
    });
    setMode(1);
    startTimer();
  });
}

function nextQuestion() {
  ws.sendJSON({
    cmd: "NextQuestion"
  });
  startTimer();
}

function prevQuestion() {
  ws.sendJSON({
    cmd: "PrevQuestion"
  });
  seconds = 0;
  stopTimer();
}

function showAnswersList(inMode) {
  var correctAnswer = $("#correctAnswer").val().toUpperCase();
  $("#answers").children("span").each(function (idx, itm) {
    if (inMode == 1) {
      $(itm).html($(itm).attr("id"));
    } else {
      $(itm).html($(itm).data("answer"));
    }
    if (correctAnswer > "") {
      if ($(itm).data("answer") > "") {
        if ($(itm).data("answer") == correctAnswer) {
          $(itm)[0].className = "user correct";
        } else {
          $(itm)[0].className = "user incorrect";
        }
      } else {
        $(itm)[0].className = "user";
      }
    } else {
      if ($(itm).data("answer") > "") {
        $(itm)[0].className = "user answered";
      } else {
        $(itm)[0].className = "user";
      }
    }
    if ($(itm).data("active") == false) {
      $(itm).addClass("userInactive");
    }
  });
  setMode(inMode);
}

function toggle(status) {
  $("#toggle").show();
  if (status != null) active = status;
  else active = !active;

  if (active) {
    $("#toggle")[0].className = 'active';
    $("#toggle").html("Active");
    startTimer();
  } else {
    $("#toggle")[0].className = 'inactive';
    $("#toggle").html("Inactive");
    stopTimer();
  }
  ws.sendJSON({
    cmd: "Active",
    active: active
  });
}

function showAnswersGraph() {
  setMode(3);
  var data = new Array(7);
  var labels = new Array(7);
  var backgroundColors = new Array(7).fill($("#correctAnswer").val() > "" ? "#ff0000" : "#00bfff");
  for (var i = 0; i < 7; i++) {
    labels[i] = String.fromCharCode(65 + i);
    if (labels[i] == $("#correctAnswer").val()) backgroundColors[i] = "#008000"
    data[i] = 0;
  }
  //data = [10, 15, 20, 14, 4];
  $("#answers").children("span").each(function (idx, itm) {
    var answer = $(itm).data("answer");
    if (labels.indexOf(answer) >= 0) {
      ++data[answer.charCodeAt(0) - 65];
    }
  });
  if (myChart) {
    myChart.destroy();
  }
  myChart = new Chart($("#chartCanvas"), {
    type: 'bar',
    data: {
      labels: ["A", "B", "C", "D", "E", "F", "G"],
      datasets: [{
        //label: 'Answers',
        data: data,
        backgroundColor: backgroundColors //"#00bfff" // or array
      }]
    },
    options: {
      responsive: false,
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });
}