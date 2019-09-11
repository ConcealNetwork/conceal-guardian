function loadGuardianLogData() {
  $.get("/getGuardianLog", function (data) {
    $("#guardianLog").text(data);
  });
}

function loadGuardianLog() {
  $.get("/guardianLog.html", function (data) {
    $("#container").html(data);
    loadGuardianLogData();
  });
}