var pageState = null;

function loadDashboard() {
  pageState = "dashboard";

  $.get("/dashboard.html", function (template) {
    var templateScript = Handlebars.compile(template);

    $.getJSON("/getInfo", function (data) {
      $("#container").html(templateScript(data));

      setTimeout(function () {
        if (pageState == "dashboard") {
          loadDashboard();
        }
      }, 5000);
    });
  });
}

function loadDaemonLog() {
  pageState = "daemonLog";

  $.get("/daemonLog.html", function (data) {
    $("#container").html(data);
  });
}

function loadGuardianLog() {
  pageState = "guardianLog";

  $.get("/guardianLog.html", function (data) {
    $("#container").html(data);
  });
}

$(document).ready(function () {
  Handlebars.registerHelper("getCountryName", function (countryCode) {
    if (isoCountries.hasOwnProperty(countryCode)) {
      return isoCountries[countryCode];
    } else {
      return countryCode;
    }
  });

  $("#dashboardLink").on("click", function () {
    pageState = "dashboard";
    loadDashboard();
  });

  $("#daemonLogLink").on("click", function () {
    loadDaemonLog();
  });

  $("#guardianLogLink").on("click", function () {
    loadGuardianLog();
  });

  switch (window.location.hash) {
    case "#dashboard":
      pageState = "dashboard";
      loadDashboard();
      break;
    case "#daemonLog":
      loadDaemonLog();
      break;
    case "#guardianLog":
      loadGuardianLog();
      break;
    default:
      pageState = "dashboard";
      loadDashboard();
  }
});