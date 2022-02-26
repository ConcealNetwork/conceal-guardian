// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const commandLineArgs = require("command-line-args");
const child_process = require("child_process");
const apiServer = require("./apiServer.js");
const notifiers = require("./notifiers.js");
const download = require("./download.js");
const readline = require("readline");
const request = require("request");
const moment = require("moment");
const comms = require("./comms.js");
const pjson = require('../package.json');
const utils = require("./utils.js");
const execa = require('execa');
const axios = require('axios');
const path = require("path");
const fs = require("fs");
const os = require("os");

exports.NodeGuard = function (cmdOptions, configOpts, rootPath, guardVersion) {
  const nodeUniqueId = utils.ensureNodeUniqueId();
  var poolNotifyInterval = null;
  var startupTime = moment();
  var errorCount = 0;
  var isStoping = false;
  var isUpdating = false;
  var initInterval = null;
  var poolInterval = null;
  var locationData = null;
  var autoRestart = true;
  var initialized = false;
  var killTimeout = null;
  var nodeProcess = null;
  var externalIP = null;
  var rpcComms = null;
  var self = this;

  // get GEO data
  (async () => {
    try {
      ipResponse = await axios.get('https://api.ipify.org');
      // set the external ip data from request
      externalIP = ipResponse.data;      

      // then get the geo data for the external IP
      geoResponse = await axios.get(`https://ipapi.co/${ipResponse.data}/json/`);
      
      locationData = {
        country: geoResponse.data.country_name,
        countryCode: geoResponse.data.country_code,
        region: geoResponse.data.region,
        regionCode: geoResponse.data.region_code,
        city: geoResponse.data.city,
        postal: geoResponse.data.postal,
        ip: geoResponse.data.ip,
        latitude: geoResponse.data.latitude,
        longitude: geoResponse.data.longitude,
        timezone: geoResponse.data.timezone
      }
    } catch(err) {
      locationData = null;
      console.log(err);
    }
  })();

  this.stop = function (doAutoRestart) {
    logMessage("Stopping the daemon process", "info", false);

    autoRestart = (doAutoRestart != null) ? doAutoRestart : true;
    clearInterval(poolNotifyInterval);

    if (rpcComms) {
      rpcComms.stop();

      if (poolInterval) {
        clearInterval(poolInterval);
        poolInterval = null;
      }
    }

    if (nodeProcess) {
      if (nodeProcess) {
        logMessage("Sending SIGTERM to daemon process", "info", false);

        isStoping = true;
        nodeProcess.kill('SIGTERM', {
          forceKillAfterTimeout: (configOpts.restart.terminateTimeout || 60) * 1000
        });
      }
    }
  };

  this.logError = function (errMessage) {
    logMessage(errMessage, "error", false);
  };

  this.getProcess = function() {
    return nodeProcess;
  }

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
        startTime: startupTime,
        initialized: initialized
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
    clearInterval(initInterval);
    self.stop();
  }

  function setNotifyPoolInterval() {
    if (configOpts.pool && configOpts.pool.notify && configOpts.pool.notify.url) {
      // send the info about node to the pool
      logMessage("Starting the periodic pool notifications", "info", false);

      poolNotifyInterval = setInterval(function () {
        try {
          var packetData = {
            uri: configOpts.pool.notify.url,
            strictSSL: false,
            method: "POST",
            timeout: 10000,
            json: getNodeInfoData()
          };

          request(packetData, function (err, res, data) {
            if (err) {
              logMessage(err.message, "error", false);
            }
          });

        } catch (err) {
          logMessage(err.message, "error", false);
        }
      }, (configOpts.pool.notify.interval || 30) * 1000);
    }
  }

  //*************************************************************//
  //         periodically check if the core has initialized
  //*************************************************************//
  function waitForCoreToInitialize() {
    if (!initialized) {
      var duration = moment.duration(moment().diff(startupTime));

      if (duration.asSeconds() > (configOpts.restart.maxInitTime || 900)) {
        restartDaemonProcess("Initialization is taking to long, restarting", true);
      } else {
        request.get({
          url: `http://127.0.0.1:${configOpts.node.port}/getinfo`,
          headers: { 'User-Agent': 'Conceal Node Guardian' },
          timeout: 5000,
          json: true
        }, (err, res, release) => {
          if ((!err) && (res.body.status === "OK")) {
            logMessage("Core is initialized, starting the periodic checking...", "info", false);
            clearInterval(initInterval);
            initialized = true;

            if (!rpcComms) {
              rpcComms = new comms.RpcCommunicator(configOpts, errorCallback);
            }

            // start comms
            rpcComms.start();
          }
        });
      }
    }
  }

  //*************************************************************//
  //         start the daemon process and then monitor it
  //*************************************************************//
  function startDaemonProcess() {
    (async () => {
      nodeProcess = execa(utils.getNodeActualPath(cmdOptions, configOpts, rootPath), configOpts.node.args || []);
    })().catch(err => {
      logMessage(`Error starting the daemon process: ${err}`, 'info', false);
      nodeProcess = null;
    });

    logMessage('Started the daemon process', 'info', false);
    startupTime = moment();
    autoRestart = true;
    isStoping = false;

    if (!nodeProcess) {
      logMessage("Failed to start the process instance. Stopping.", "error", false);
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    } else {
      nodeProcess.on("error", function (err) {
        restartDaemonProcess(`Error on starting the node process: ${err}`, false);
      });

      // if daemon closes the try to log and restart it
      nodeProcess.on("exit", function (code, signal) {
        initialized = false;
        nodeProcess = null;

        // check if we need to stop it
        if (isStoping === false) {
          self.stop(false);
        }

        // always do a cleanup of resources
        clearTimeout(killTimeout);

        // check if we need to restart
        if (autoRestart) {
          errorCount = errorCount + 1;

          if (!signal) {
            // only log if signall is empty, which means it was spontaneous crash
            logMessage(`Node process closed with code ${code}`, "error", true);
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
        }
      });

      // start notifying the pool
      setNotifyPoolInterval();
      // start the initilize checking
      initInterval = setInterval(function () {
        waitForCoreToInitialize();
      }, 10000);
    }
  }

  // check if autoupdate is turned on
  if (configOpts.node && configOpts.node.autoUpdate) {
    setInterval(function () {
      if (rpcComms && initialized && !isUpdating) {        
        let nodeData = rpcComms.getData();

        // check node
        if (nodeData) {
          request.get({
            url: 'https://api.github.com/repos/ConcealNetwork/conceal-core/releases/latest',
            headers: { 'User-Agent': 'Conceal Node Guardian' },
            json: true
          }, (err, res, release) => {
            if (!err && release) {
              if (release.tag_name !== nodeData.version) {
                // stop the daemon
                isUpdating = true;
                self.stop(false);

                let waitStopInteval = setInterval(function () {
                  if (nodeProcess == null) {
                    clearInterval(waitStopInteval);

                    download.downloadLatestDaemon(utils.getNodeActualPath(cmdOptions, configOpts, rootPath), function (error) {
                      if (error) {
                        logMessage(`\nError auto updating daemon: ${error}\n`, "error", true);
                      } else {
                        logMessage("The deamon was automatically updated", "info", true);
                      }

                      // start the daemon 
                      startDaemonProcess();
                      isUpdating = false;
                    });
                  }
                }, 1000);
              }
            } else {
              logMessage(`\nError auto updating daemon: ${err}\n`, "error", true);
              isUpdating = false;
            }
          });
        }
      }
    }, 3600000);
  }

  // create a server object if required, its used
  // for servicing API calls for the current node
  if (configOpts.api && configOpts.api.port) {
    logMessage("Starting the API server", "info", false);
    var nodeDirectory = path.dirname(utils.getNodeActualPath(cmdOptions, configOpts, rootPath));
    apiServer.createServer(configOpts, nodeDirectory, function () {
      return getNodeInfoData();
    });
  }

  // start the process
  logMessage("Starting the guardian", "info", false);
  startDaemonProcess();
};