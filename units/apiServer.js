// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.
const readLastLines = require('read-last-lines');
const express = require("express");
const utils = require("./utils.js");
const path = require("path");

module.exports = {
  createServer: function (config, nodeDirectory, onDataCallback) {
    const app = express();

    app.listen(config.api.port, () => {
      console.log("API server running on port " + config.api.port);
    });

    app.get("/getInfo", (req, res) => {
      var statusResponse = onDataCallback();
      res.set('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'ConcealNodeGuard');
      res.json(statusResponse);
    });

    app.get("/getDaemonLog", (req, res) => {
      readLastLines.read(path.join(nodeDirectory, 'conceald.log'), 500).then((lines) => {
        res.send(lines);
      });
    });

    app.get("/getGuardianLog", (req, res) => {
      readLastLines.read(path.join(utils.ensureUserDataDir(), 'debug.log'), 500).then((lines) => {
        res.send(lines);
      });
    });

    app.get("/index.html", (req, res) => {
      res.sendFile(path.resolve('html/index.html'));
    });

    app.get("/dashboard.html", (req, res) => {
      res.sendFile(path.resolve('html/dashboard.html'));
    });

    app.get("/daemonLog.html", (req, res) => {
      res.sendFile(path.resolve('html/daemonLog.html'));
    });

    app.get("*", (req, res) => {
      res.sendFile(path.resolve('html' + req.path));
    });
  }
};
