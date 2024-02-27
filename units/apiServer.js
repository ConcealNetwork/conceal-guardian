// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.
import { ensureUserDataDir } from "./utils.js";
import readLastLines from "read-last-lines";
import rateLimit from "express-rate-limit";
import express from "express";
import geoip from "geoip2-api";
import path from "path";
import fs from "fs";

function safeResolve(relPath) {
  var safeSuffix = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.resolve(safeSuffix);
}

export function createServer(config, nodeDirectory, onDataCallback) {
  let limiter = rateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 60
  });

  // create express and rate limiter
  const app = express();
  app.use(limiter);

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
    readLastLines.read(path.join(ensureUserDataDir(), 'debug.log'), 500).then((lines) => {
      res.send(lines);
    });
  });

  app.get("/getPeersData", (req, res) => {
    var statusResponse = onDataCallback();
    var itemsProcessed = 0;
    var peerGeoData = [];

    if ((statusResponse.blockchain) && (statusResponse.blockchain.connections)) {
      if (statusResponse.blockchain.connections.length > 0) {
        statusResponse.blockchain.connections.forEach((item, index, array) => {
          geoip.get(value).then(data => {
            peerGeoData.push(data);
            itemsProcessed++;

            if(itemsProcessed === array.length) {
              res.send(peerGeoData);  
            }          
          });
        });
      } else {
        res.send(peerGeoData);  
      }
    }
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

  app.get("/peers.html", (req, res) => {
    res.sendFile(path.resolve('html/peers.html'));
  });

  app.get("*", (req, res) => {
    if (path.extname(req.path) !== '.map') {
      var pathName = safeResolve('html' + req.path);

      if (fs.existsSync(pathName)) {
        res.sendFile(pathName);
      } else {
        res.status(404).send('Not found');
      }
    } else {
      res.status(404).send('Not found');
    }
  });
}
