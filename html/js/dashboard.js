function loadDashboard() {
  Handlebars.registerHelper("getCountryName", function (countryCode) {
    if (isoCountries.hasOwnProperty(countryCode)) {
      return isoCountries[countryCode];
    } else {
      return countryCode;
    }
  });

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
