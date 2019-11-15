var pageState = null;

function setNavActive(navId) {
  $("#mainNav").find(".nav-item").removeClass("active");
  $(navId).parent().addClass("active");
}

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

function loadPeersMap() {
  pageState = "peersMap";

  $.get("/peers.html", function (data) {
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
    setNavActive("#dashboardLink");
    pageState = "dashboard";
    loadDashboard();
  });

  $("#daemonLogLink").on("click", function () {
    setNavActive("#daemonLogLink");
    loadDaemonLog();
  });

  $("#guardianLogLink").on("click", function () {
    setNavActive("#guardianLogLink");
    loadGuardianLog();
  });

  $("#peersMapLink").on("click", function () {
    setNavActive("#peersMapLink");
    loadPeersMap();
  });

  switch (window.location.hash) {
    case "#dashboard":
      setNavActive("#dashboardLink");
      pageState = "dashboard";
      loadDashboard();
      break;
    case "#daemonLog":
      setNavActive("#daemonLogLink");
      loadDaemonLog();
      break;
    case "#guardianLog":
      setNavActive("#guardianLogLink");
      loadGuardianLog();
      break;
    case "#peersMap":
      setNavActive("#peersMapLink");
      loadPeersMap();
      break;
    default:
      pageState = "dashboard";
      loadDashboard();
  }
});