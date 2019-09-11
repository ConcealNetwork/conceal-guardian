var pageState = "dashboard";

$(document).ready(function () {
  loadDashboard();

  $("#dashboardLink").on("click", function () {
    pageState = "dashboard";
    loadDashboard();
  });

  $("#daemonLogLink").on("click", function () {
    pageState = "daemonLog";
    loadDaemonLog();
  });

  $("#guardianLogLink").on("click", function () {
    pageState = "guardianLog";
    loadGuardianLog();
  });


});