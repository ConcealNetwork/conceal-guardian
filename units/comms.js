// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const moment = require("moment");
const CCX = require("conceal-api");

module.exports = {
  RpcCommunicator: function (configOpts, errorCallback) {
    // create the CCX api interface object
    var CCXApi = new CCX({
      daemonHost: "http://127.0.0.1", 
      daemonRpcPort: configOpts.node.port,
      timeout: (configOpts.node.rfcTimeout || 5) * 1000
    });
    var checkInterval = null;
    var timeoutCount = 0;
    var IsRunning = false;
    var lastHeight = 0;
    var infoData = null;
    var lastTS = moment();

    this.stop = function () {
      clearInterval(checkInterval);
      IsRunning = false;
    };

    this.getData = function () {
      return infoData;
    };

    this.start = function () {
      IsRunning = true;
      timeoutCount = 0;
      lastTS = moment();

      // set the periodic checking interval
      checkInterval = setInterval(function () {
        checkAliveAndWell();
      }, 30000);
    };

    function checkAliveAndWell() {
      if (IsRunning) {
        CCXApi.info().then(data => {
          var heightIsOK = true;
          infoData = data;

          if (lastHeight !== data.height) {
            console.log(`Current block height is ${data.height}`);
            lastHeight = data.height;
            lastTS = moment();
          } else {
            var duration = moment.duration(moment().diff(lastTS));

            if (duration.asSeconds() > (configOpts.restart.maxBlockTime || 1800)) {
              errorCallback(`No new block has be seen for more then ${(configOpts.restart.maxBlockTime || 1800) / 60} minutes`);
              heightIsOK = false;
            }
          }

          if (heightIsOK) {
            if (data.status !== "OK") {
              errorCallback("Status is: " + data.status);
            } else {
              // reset counter
              timeoutCount = 0;
            }
          }
        }).catch(err => {
          if (IsRunning) {
            timeoutCount++;
            if (timeoutCount >= 3) {
              errorCallback(err);
            }
          }
        });
      }
    }
  }
};
