// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

"use strict";

const child_process = require("child_process");
const vsprintf = require("sprintf-js").vsprintf;
const readline = require("readline");
const request = require("request");
const moment = require("moment");
const comms = require("./comms.js")
const UUID = require("pure-uuid");
const path = require("path");
const http = require("http");
const fs = require("fs");
const os = require("os");

const NodeGuard = function () {
  var rootPath = process.cwd();

  function ensureUserDataDir() {
    var userDataDir = process.env.APPDATA || (
      process.platform == "darwin"
      ? process.env.HOME + "Library/Preferences"
      : process.env.HOME + "/.local/share");
    userDataDir = path.join(userDataDir, "ConcealNodeGuard");

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir);
    }

    return userDataDir;
  }

  function ensureNodeUniqueId() {
    var nodeDataFile = path.join(ensureUserDataDir(), "nodedata.json");

    if (fs.existsSync(nodeDataFile)) {
      var nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
      return nodeData.id;
    } else {
      var nodeData = { id: new UUID(4).format() }
      fs.writeFileSync( nodeDataFile, JSON.stringify(nodeData), "utf8");
      return nodeData.id;
    }
  }

  // set the daemon path and start the node process
  const daemonPath = path.join(rootPath, "conceald");
  var configOpts = JSON.parse(fs.readFileSync(path.join(rootPath, "config.json"), "utf8"));
  var nodeUniqueId = ensureNodeUniqueId();
  var starupTime = moment();
  var errorCount = 0;
  var PoolInterval = null;
  var initialized = false;
  var nodeProcess = null;
  var RpcComms = null;

  this.stop = function () {
    if (RpcComms) {
      RpcComms.stop();
      RpcComms = null;

      if (PoolInterval) {
        clearInterval(PoolInterval);
        PoolInterval = null;  
      }
    }

    if (nodeProcess) {
      nodeProcess.kill("SIGTERM");
    }
  };

  function errorCallback(errorData) {
    restartDaemonProcess(errorData, true);
  }

  /***************************************************************
          log the error to text file and send it to Discord
  ***************************************************************/
  function logMessage(msgText, msgType, sendNotification) {
    var userDataDir = ensureUserDataDir();
    var logEntry = [];

    logEntry.push(moment().format('YYYY-MM-DD hh:mm:ss'));
    logEntry.push(msgType);
    logEntry.push(msgText);


    // write every error to a log file for possible later analization
    fs.appendFile(path.join(userDataDir, "debug.log"), logEntry.join('\t') + "\n", function (err) {});
    console.log(logEntry.join('\t'));

    // send notification if specified in the config
    if (sendNotification && configOpts.notify.url) {
      var hookOptions = {
        uri: configOpts.notify.url,
        method: "POST",
        json: {
          content: vsprintf("Node **%s** reported an error -> %s", [
            configOpts.node.name || os.hostname(),
            msgText + "\n"
          ])
        }
      };

      request(hookOptions, function (error, response, data) {
        // for now its fire and forget, no matter if error occurs
      });
    }
  }

  /***************************************************************
          restarts the node if an error occurs automatically
    ***************************************************************/
  function restartDaemonProcess(errorData, sendNotification) {
    logMessage(errorData, "error", sendNotification);

    // increase error count and stop instance
    errorCount = errorCount + 1;
    guardInstance.stop();

    // check if we have crossed the maximum error number in short period
    if (errorCount > (configOpts.restart.maxCloseErrors || 3)) {
      logMessage("To many errors in a short ammount of time. Stopping.", "error", true);
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    } else {
      startDaemonProcess();
    }

    setTimeout(() => {
      errorCount = errorCount - 1;
    }, (configOpts.restart.errorForgetTime || 600) * 1000);
  }

  function checkIfInitialized() {
    if (!initialized) {
      var duration = moment.duration(moment().diff(starupTime));

      if (duration.asSeconds() > (configOpts.restart.maxInitTime || 600)) {
        restartDaemonProcess("Initialization is taking to long, restarting", true);
      } else {
        setTimeout(() => {
          checkIfInitialized();
        }, 5000);
      }
    }
  }

  function setNotifyPoolInterval() {
    if ((configOpts.notify) && (configOpts.notify.url)) {
      // send the info about node to the pool
      var PoolInterval = setInterval(function() {
        var packetData = {
          uri: configOpts.notify.url,
          method: "POST",
          json: {
            id: nodeUniqueId,
            status: {
              name: configOpts.node.name || os.hostname(),
              errors: errorCount,
              startTime: starupTime,
              blockHeight: RpcComms
                ? RpcComms.getLastHeight()
                : 0,
              nodeVersion: RpcComms
                ? RpcComms.getVersion()
                : ""
            }
          }
        };
  
        request(packetData, function (error, response, data) {
          // for now its fire and forget, no matter if error occurs
        });
          
      }, (configOpts.notify.interval || 30) * 1000);    
    }
  }

  function startDaemonProcess() {
    nodeProcess = child_process.spawn(configOpts.node.path || daemonPath, configOpts.node.args || []);
    logMessage("Started the daemon process", "info", false);

    if (!nodeProcess) {
      logMessage("Failed to start the process instance. Stopping.", "error", false);
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    } else {
      nodeProcess.on("error", function (err) {
        restartDaemonProcess("Error on starting the node process", false);
      });
      nodeProcess.on("close", function (err) {
        restartDaemonProcess("Node process closed with: " + err, true);
      });

      const dataStream = readline.createInterface({input: nodeProcess.stdout});

      const errorStream = readline.createInterface({input: nodeProcess.stderr});

      function processSingleLine(line) {
        // core is initialized, we can start the queries
        if (line.indexOf("Core initialized OK") > -1) {
          logMessage("Core is initialized, starting the periodic checking...", "info", false);
          initialized = true;

          RpcComms = new comms.RpcCommunicator(configOpts, errorCallback);
          RpcComms.start();
        }
      }

      dataStream.on("line", line => {
        processSingleLine(line);
      });

      errorStream.on("line", line => {
        processSingleLine(line);
      });

      // start notifying the pool
      setNotifyPoolInterval();
      // start the initilize checking
      checkIfInitialized();
    }
  }

  //create a server object if required
  if (configOpts.api && configOpts.api.port) {
    http.createServer(function (req, res) {
      if (req.url.toUpperCase() == "/GETINFO") {
        var statusResponse = {
          status: {
            name: configOpts.node.name || os.hostname(),
            errors: errorCount,
            startTime: starupTime,
            blockHeight: RpcComms
              ? RpcComms.getLastHeight()
              : 0,
            nodeVersion: RpcComms
              ? RpcComms.getVersion()
              : ""
          }
        };

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
    }).listen(configOpts.api.port);
  }  

  // start the process
  logMessage("Starting the guardian", "info", false);
  startDaemonProcess();
};

process.on("exit", function () {
  guardInstance.stop();
});

var guardInstance = new NodeGuard();