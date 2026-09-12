var pageState = null;

var DOM_PURIFY_CONFIG = {
  ADD_TAGS: ["pre", "code"],
  ADD_ATTR: ["data-src", "class", "id"],
  ALLOW_DATA_ATTR: true,
  FORCE_BODY: false,
};

// Same-origin fragments (daemon/guardian/peers/dashboard) include <script>.
// Old patched jQuery skipped DOMPurify when script/style/link were present
// (rnoInnerhtml) so those scripts could run — match that here.
function setContainerHtml(html) {
  if (/<(?:script|style|link)/i.test(html)) {
    $("#container").html(html);
    return;
  }

  $("#container").html(window.DOMPurify.sanitize(html, DOM_PURIFY_CONFIG));
}

function setNavActive(navId) {
  $("#mainNav").find(".nav-item").removeClass("active");
  $(navId).parent().addClass("active");
}

function loadDashboard() {
  pageState = "dashboard";

  $.get("/dashboard.html", function (template) {
    var templateScript = Handlebars.compile(template);

    $.getJSON("/getInfo", function (data) {
      setContainerHtml(templateScript(data));

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
    setContainerHtml(data);
  });
}

function loadGuardianLog() {
  pageState = "guardianLog";

  $.get("/guardianLog.html", function (data) {
    setContainerHtml(data);
  });
}

function loadPeersMap() {
  pageState = "peersMap";

  $.get("/peers.html", function (data) {
    setContainerHtml(data);
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
