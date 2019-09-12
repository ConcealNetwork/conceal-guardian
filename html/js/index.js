var pageState = "dashboard";

function loadDashboard() {
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
    pageState = "daemonLog";

    $.get("/daemonLog.html", function (data) {
      $("#container").html(data);
    });
  });

  $("#guardianLogLink").on("click", function () {
    pageState = "guardianLog";

    $.get("/guardianLog.html", function (data) {
      $("#container").html(data);
    });
  });

  loadDashboard();
});