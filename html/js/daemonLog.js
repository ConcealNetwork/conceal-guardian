function loadDaemonLogData() {
  $.get("/getDaemonLog", function (data) {
    $("#daemonLog").text(data);
  });
}

function loadDaemonLog() {
  $.get("/daemonLog.html", function (data) {
    $("#container").html(data);
    loadDaemonLogData();
  });
}