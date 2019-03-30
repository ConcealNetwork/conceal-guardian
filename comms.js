// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

"use strict";

const moment = require("moment");
const CCX = require("conceal-js");

module.exports = {
    RpcCommunicator: function (configOpts, errorCallback) {
        // create the CCX api interface object
        var CCXApi = new CCX("http://127.0.0.1", "3333", configOpts.node.port);
        var IsRunning = false;
        var lastHeight = 0;
        var version = "";
        var lastTS = moment();

        this.stop = function () {
            IsRunning = false;
        };

        this.getVersion = function () {
            return version;
        };

        this.getLastHeight = function () {
            return lastHeight;
        };

        this.start = function () {
            IsRunning = true;
            checkAliveAndWell();
        };

        function checkAliveAndWell() {
            if (IsRunning) {
            CCXApi.info().then(data => {
                var heightIsOK = true;
                version = data.version;

                if (lastHeight !== data.height) {
                lastHeight = data.height;
                lastTS = moment();
                } else {
                var duration = moment.duration(moment().diff(lastTS));

                if (duration.asSeconds() > (configOpts.restart.maxBlockTime || 1800)) {
                    errorCallback("No new block has be seen for more then 30 minutes");
                    heightIsOK = false;
                }
                }

                if (heightIsOK) {
                if (data.status !== "OK") {
                    errorCallback("Status is: " + data.status);
                } else {
                    setTimeout(() => {
                    checkAliveAndWell();
                    }, 5000);
                }
                }
            }).catch(err => {
                errorCallback(err);
            });
            }
        }
    }
};
