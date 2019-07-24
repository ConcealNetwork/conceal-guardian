// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const commandLineArgs = require("command-line-args");
const child_process = require("child_process");
const iplocation = require("iplocation").default;
const apiServer = require("./apiServer.js");
const notifiers = require("./notifiers.js");
const vsprintf = require("sprintf-js").vsprintf;
const publicIp = require("public-ip");
const readline = require("readline");
const request = require("request");
const moment = require("moment");
const comms = require("./comms.js");
const utils = require("./utils.js");
const fkill = require('fkill');
const path = require("path");
const fs = require("fs");
const os = require("os");

exports.NodeGuard = function (cmdOptions, configOpts, rootPath, guardVersion) {
  const nodeUniqueId = utils.ensureNodeUniqueId();
  var starupTime = moment();
  var errorCount = 0;
  var poolInterval = null;
  var locationData = null;
  var initialized = false;
  var killTimeout = null;
  var nodeProcess = null;
  var errorStream = null;
  var dataStream = null;
  var externalIP = null;
  var rpcComms = null;
  var self = this;

  // get GEO data
  (async () => {
    externalIP = await publicIp.v4();

    iplocation(externalIP, [], (error, res) => {
      if (!error) {
        locationData = res;
      }
    });
  })();

  this.stop = function () {
    if (rpcComms) {
      rpcComms.stop();
      rpcComms = null;

      if (poolInterval) {
        clearInterval(poolInterval);
        poolInterval = null;
      }
    }

    if (nodeProcess) {
      nodeProcess.kill("SIGTERM");

      // if normal fails, do a forced terminate
      killTimeout = setTimeout(function () {
        (async () => {
          await fkill(nodeProcess.pid, { force: true });
        })();
      }, (configOpts.restart.terminateTimeout || 5) * 1000);
    }
  };

  this.logError = function (errMessage) {
    logMessage(errMessage, "error", false);
  };

  function errorCallback(errorData) {
    restartDaemonProcess(errorData, true);
  }

  //*************************************************************//
  //        get the info about the node in full details
  //*************************************************************//
  function getNodeInfoData() {
    return {
      id: nodeUniqueId,
      os: process.platform,
      name: configOpts.node.name || os.hostname(),
      version: guardVersion,
      nodeHost: externalIP,
      nodePort: configOpts.node.port,
      url: configOpts.url,
      status: {
        errors: errorCount,
        startTime: starupTime
      },
      blockchain: rpcComms ? rpcComms.getData() : null,
      location: {
        ip: externalIP,
        data: locationData
      }
    };
  }

  //*************************************************************//
  //       log the error to text file and send it to Discord
  //*************************************************************//
  function logMessage(msgText, msgType, sendNotification) {
    var userDataDir = utils.ensureUserDataDir();
    var logEntry = [];

    logEntry.push(moment().format("YYYY-MM-DD hh:mm:ss"));
    logEntry.push(msgType);
    logEntry.push(msgText);

    // write every error to a log file for possible later analization
    fs.appendFile(path.join(userDataDir, "debug.log"), logEntry.join("\t") + "\n", function () { });
    console.log(logEntry.join("\t"));

    // send notification if specified in the config
    if (sendNotification && configOpts.error && configOpts.error.notify) {
      notifiers.notifyOnError(configOpts, msgText, msgType, getNodeInfoData());
    }
  }

  //*************************************************************//
  //     restarts the node if an error occurs automatically
  //*************************************************************//
  function restartDaemonProcess(errorData, sendNotification) {
    logMessage(errorData, "error", sendNotification);
    self.stop();
  }

  function checkIfInitialized() {
    if (!initialized) {
      var duration = moment.duration(moment().diff(starupTime));

      if (duration.asSeconds() > (configOpts.restart.maxInitTime || 900)) {
        restartDaemonProcess("Initialization is taking to long, restarting", true);
      } else {
        setTimeout(() => {
          checkIfInitialized();
        }, 5000);
      }
    }
  }

  function setNotifyPoolInterval() {
    if (configOpts.pool && configOpts.pool.notify && configOpts.pool.notify.url) {
      // send the info about node to the pool
      setInterval(function () {
        var packetData = {
          uri: configOpts.pool.notify.url,
          strictSSL: false,
          method: "POST",
          json: getNodeInfoData()
        };

        request(packetData, function (err, res, data) {
          if (err) {
            logMessage(err.message, "error", false);
          }
        });
      }, (configOpts.pool.notify.interval || 30) * 1000);
    }
  }

  //*************************************************************//
  //         processes a single line from data or error stream
  //*************************************************************//
  function processSingleLine(line) {
    // core is initialized, we can start the queries
    if (line.indexOf("Core initialized OK") > -1) {
      logMessage("Core is initialized, starting the periodic checking...", "info", false);
      initialized = true;

      rpcComms = new comms.RpcCommunicator(configOpts, errorCallback);
      rpcComms.start();

      errorStream.close();
      dataStream.close();
    }
  }

  //*************************************************************//
  //         start the daemon process and then monitor it
  //*************************************************************//
  function startDaemonProcess() {
    nodeProcess = child_process.spawn(utils.getNodeActualPath(cmdOptions, configOpts, rootPath), configOpts.node.args || []);
    logMessage("Started the daemon process", "info", false);

    if (!nodeProcess) {
      logMessage("Failed to start the process instance. Stopping.", "error", false);
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    } else {
      dataStream = readline.createInterface({
        input: nodeProcess.stdout
      });

      errorStream = readline.createInterface({
        input: nodeProcess.stderr
      });

      dataStream.on("line", line => {
        processSingleLine(line);
      });

      errorStream.on("line", line => {
        processSingleLine(line);
      });

      nodeProcess.on("error", function (err) {
        restartDaemonProcess(vsprintf("Error on starting the node process: %s", [err]), false);
      });

      // if daemon closes the try to log and restart it
      nodeProcess.on("close", function (code, signal) {
        self.stop();
        clearTimeout(killTimeout);
        errorCount = errorCount + 1;

        if (!signal) {
          // only log is signall is empty which means it was spontaneous crash
          logMessage(vsprintf("Node process closed with code %d", [code]), "error", true);
        }

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
      });

      // start notifying the pool
      setNotifyPoolInterval();
      // start the initilize checking
      checkIfInitialized();
    }
  }

  // create a server object if required, its used
  // for servicing API calls for the current node
  if (configOpts.api && configOpts.api.port) {
    apiServer.createServer(configOpts, function () {
      return getNodeInfoData();
    });
  }

  // start the process
  logMessage("Starting the guardian", "info", false);
  startDaemonProcess();
};