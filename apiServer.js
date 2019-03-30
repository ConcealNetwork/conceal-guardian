// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

"use strict";

const http = require("http");

module.exports = {
    createServer: function(config, onDataCallback) {
        http.createServer(function (req, res) {
            if (req.url.toUpperCase() === "/GETINFO") {
              var statusResponse = onDataCallback();

              res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "X-Powered-By": "ConcealNodeGuard"
              });

              // send the response payload
              res.write(JSON.stringify(statusResponse));
            } else {
              res.writeHead(403);
            }

            // finish
            res.end();
        }).listen(config.api.port);
    }
};
