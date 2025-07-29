// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { downloadLatestDaemon } from "./download.js";
import commandLineArgs from "command-line-args";
import child_process from "child_process";
import { RpcCommunicator } from "./comms.js";
import { notifyOnError } from "./notifiers.js";
import { createServer } from "./apiServer.js";
import readline from "readline";
import { execa } from "execa";
import axios from "axios";
import moment from "moment";
import path from "path";
import fs from "fs";
import os from "os";
import validator from "validator";
import { 
  ensureNodeUniqueId, 
  ensureUserDataDir, 
  getNodeActualPath 
} from "./utils.js";

// read the package.json to have version info available
const pjson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json")));

export function NodeGuard (cmdOptions, configOpts, rootPath, guardVersion) {
  const nodeUniqueId = ensureNodeUniqueId();
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

  // get GEO data with retry mechanism and fallback APIs
  async function getGeoData() {
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    
    // Primary API
    const primaryIPApi = 'https://api.ipify.org';
    const primaryGeoApi = 'https://ipapi.co/{ip}/json/';
    
    // Fallback API (used after 5 attempts) - More reputable alternatives
    const fallbackIPApi = 'https://checkip.amazonaws.com';
    const fallbackGeoApi = 'https://ipinfo.io/{ip}/json';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logMessage(`Attempting to get geolocalization data (attempt ${attempt}/${maxRetries})`, "info", false);
        
        // Choose API based on attempt number
        const ipApi = attempt > 5 ? fallbackIPApi : primaryIPApi;
        const geoApi = attempt > 5 ? fallbackGeoApi : primaryGeoApi;
        
        if (attempt > 5) {
          logMessage("Switching to fallback API after 5 attempts", "info", false);
        }
        
        // Get external IP
        let ipResponse = await axios.get(ipApi, { 
          timeout: retryDelay,
          headers: { 'User-Agent': 'Conceal Node Guardian' }
        });
        
        // Validate IP response
        if (!ipResponse.data || typeof ipResponse.data !== 'string') {
          throw new Error('Invalid IP response format');
        }
        
        // Handle different IP API response formats
        if (attempt > 5) {
          // checkip.amazonaws.com returns plain text: "x.y.z.t"
          externalIP = ipResponse.data.trim();
        } else {
          // api.ipify.org returns plain text: "x.y.z.t"
          externalIP = ipResponse.data.trim();
        }
        
        // Validate IP format
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(externalIP)) {
          throw new Error('Invalid IP address format received');
        }
        
        logMessage("Detecting geolocalization data", "info", false);
        
        // Validate and construct geo API URL
        const geoApiUrl = geoApi.replace('{ip}', externalIP);
        if (!geoApiUrl.startsWith('https://')) {
          throw new Error('Invalid geo API URL');
        }
        
        // Get geo data
        let geoResponse = await axios.get(geoApiUrl, { 
          timeout: retryDelay,
          headers: { 'User-Agent': 'Conceal Node Guardian' }
        });
        
        // Validate geo response
        if (!geoResponse.data || typeof geoResponse.data !== 'object') {
          throw new Error('Invalid geo response format');
        }
        
        let geoData = geoResponse.data;
        
        // Handle different response formats
        if (attempt > 5) {
          // ipinfo.io format
          locationData = {
            country: geoData.country,
            countryCode: geoData.country,
            region: geoData.region,
            regionCode: geoData.region,
            city: geoData.city,
            postal: geoData.postal,
            ip: geoData.ip,
            latitude: parseFloat(geoData.loc.split(',')[0]),
            longitude: parseFloat(geoData.loc.split(',')[1]),
            timezone: geoData.timezone
          };
        } else {
          // ipapi.co format
          locationData = {
            country: geoData.country_name,
            countryCode: geoData.country_code,
            region: geoData.region,
            regionCode: geoData.region_code,
            city: geoData.city,
            postal: geoData.postal,
            ip: geoData.ip,
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            timezone: geoData.timezone
          };
        }
        
        logMessage("Geolocalization successful", "info", false);
        return; // Success, exit the retry loop
        
      } catch(err) {
        logMessage(`Geolocalization attempt ${attempt} failed: ${err.message}`, "error", false);
        
        if (attempt === maxRetries) {
          logMessage("All geolocalization attempts failed, continuing without location data", "error", false);
          locationData = null;
          externalIP = null;
        } else {
          logMessage(`Retrying geolocalization in ${retryDelay/1000} seconds...`, "info", false);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  // Start geolocalization process
  getGeoData();

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
      isStoping = true;
      const killingGracePeriod = 20; // Wait 20 seconds for clean exit
      // First, try to send 'exit' command for clean shutdown
      try {
        if (nodeProcess.stdin && !nodeProcess.stdin.destroyed) {
          logMessage("Sending 'exit' command to daemon for clean shutdown", "info", false);
          
          // Ensure the command is properly formatted and sent
          const exitCommand = 'exit\n';
          logMessage(`Writing to stdin: "${exitCommand.trim()}"`, "info", false);
          
          nodeProcess.stdin.write(exitCommand, (err) => {
            if (err) {
              logMessage(`Error writing to stdin: ${err.message}`, "error", false);
            } else {
              logMessage("Successfully sent 'exit' command to daemon", "info", false);
            }
          });
          
          // Give the daemon some time to process the exit command
          setTimeout(() => {
            if (nodeProcess && !nodeProcess.killed) {
              logMessage(`Daemon still running after ${killingGracePeriod} seconds, sending SIGTERM`, "info", false);
              nodeProcess.kill('SIGTERM');
            }
          }, killingGracePeriod * 1000); 
        } else {
          logMessage("Stdin not available, sending SIGTERM to daemon process", "info", false);
          nodeProcess.kill('SIGTERM');
        }
      } catch (err) {
        logMessage(`Error sending exit command: ${err.message}`, "error", false);
        logMessage("Sending SIGTERM to daemon process", "info", false);
        nodeProcess.kill('SIGTERM');
      }
      
      // Fallback to SIGKILL after timeout
      const killTimeoutMs = (configOpts.restart.terminateTimeout || 120) * 1000 < 30000 ? 30000 : (configOpts.restart.terminateTimeout || 120) * 1000;
      killTimeout = setTimeout(() => {
        if (nodeProcess && !nodeProcess.killed) {
          logMessage("Sending SIGKILL to daemon process", "info", false);
          nodeProcess.kill('SIGKILL');
        }
      }, killTimeoutMs);
    }
  };

  this.logError = function (errMessage) {
    logMessage(errMessage, "error", false);
  };

  this.getProcess = function() {
    return nodeProcess;
  }

  function errorCallback(errorData) {
    (async () => {
      await restartDaemonProcess(errorData, true);
    })();
  }

  //*************************************************************//
  //        get the info about the node in full details
  //*************************************************************//
  async function getNodeInfoData() {
    try {
      // Ensure geolocalization is complete before returning data, worth case it will return null
      if (!locationData && !externalIP) {
        logMessage("Waiting for geolocalization to complete...", "info", false);
        await getGeoData();
      }
      
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
    } catch (err) {
      logMessage(`Error in getNodeInfoData: ${err.message}`, "error", false);
      
      // Return basic data even if geolocalization fails
      return {
        id: nodeUniqueId,
        os: process.platform,
        name: configOpts.node.name || os.hostname(),
        version: guardVersion,
        nodeHost: externalIP || 'unknown',
        nodePort: configOpts.node.port,
        url: configOpts.url,
        status: {
          errors: errorCount,
          startTime: startupTime,
          initialized: initialized
        },
        blockchain: rpcComms ? rpcComms.getData() : null,
        location: {
          ip: externalIP || 'unknown',
          data: locationData
        }
      };
    }
  }

  //*************************************************************//
  //       log the error to text file and send it to Discord
  //*************************************************************//
  async function logMessage(msgText, msgType, sendNotification) {
    var userDataDir = ensureUserDataDir();
    var logEntry = [];

    logEntry.push(moment().format("YYYY-MM-DD hh:mm:ss"));
    logEntry.push(msgType);
    logEntry.push(msgText);

    // write every error to a log file for possible later analization
    fs.appendFile(path.join(userDataDir, "debug.log"), logEntry.join("\t") + "\n", function () { });
    console.log(logEntry.join("\t"));

    // send notification if specified in the config
    if (sendNotification && configOpts.error && configOpts.error.notify) {
      try {
        const nodeData = await getNodeInfoData();
        notifyOnError(configOpts, msgText, msgType, nodeData);
      } catch (err) {
        logMessage(`Error getting node data for notification: ${err.message}`, "error", false);
      }
    }
  }

  //*************************************************************//
  //     restarts the node if an error occurs automatically
  //*************************************************************//
  async function restartDaemonProcess(errorData, sendNotification) {
    await logMessage(errorData, "error", sendNotification);
    clearInterval(initInterval);
    self.stop();
  }

  function setNotifyPoolInterval() {
    if (configOpts.pool && configOpts.pool.notify && configOpts.pool.notify.url) {
      // send the info about node to the pool
      logMessage("Starting the periodic pool notifications", "info", false);

      poolNotifyInterval = setInterval(async function () {
        try {
          const nodeData = await getNodeInfoData();
          
          // Validate and sanitize data before sending using validator library
          const sanitizedData = {
            id: validator.escape(String(nodeData.id || '')).substring(0, 100),
            os: validator.escape(String(nodeData.os || '')).substring(0, 50),
            name: validator.escape(String(nodeData.name || '')).substring(0, 100),
            version: validator.escape(String(nodeData.version || '')).substring(0, 50),
            nodeHost: validator.escape(String(nodeData.nodeHost || '')).substring(0, 100),
            nodePort: Number(nodeData.nodePort) || 0,
            status: {
              errors: Number(nodeData.status?.errors) || 0,
              startTime: validator.escape(String(nodeData.status?.startTime || '')),
              initialized: Boolean(nodeData.status?.initialized)
            },
            blockchain: nodeData.blockchain ? {
              connections: Number(nodeData.blockchain.connections) || 0,
              height: Number(nodeData.blockchain.height) || 0
            } : null,
            location: {
              ip: validator.escape(String(nodeData.location?.ip || '')).substring(0, 100),
              data: nodeData.location?.data ? {
                country: validator.escape(String(nodeData.location.data.country || '')).substring(0, 100),
                city: validator.escape(String(nodeData.location.data.city || '')).substring(0, 100),
                latitude: Number(nodeData.location.data.latitude) || null,
                longitude: Number(nodeData.location.data.longitude) || null
              } : null
            }
          };

          // Validate URL - must be HTTPS and end with .conceal.network/pool/update
          if (!validator.isURL(configOpts.pool.notify.url, { 
            protocols: ['https'], 
            require_protocol: true,
            require_valid_protocol: true,
            allow_underscores: false,
            allow_trailing_dot: false,
            allow_protocol_relative_urls: false
          }) || !configOpts.pool.notify.url.endsWith('.conceal.network/pool/update')) {
            throw new Error('Invalid pool URL');
          } 
          
          // Use the validated URL
          const sanitizedPoolNotifyUrl = configOpts.pool.notify.url;
          
          axios.post(sanitizedPoolNotifyUrl, sanitizedData, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Conceal Node Guardian'
            }
          }).then(response => {
            //logMessage(`Pool notification successful: ${response.status}`, "info", false);
          }).catch(err => {
            logMessage(`Pool notification failed: ${err.message}`, "error", false);
          });

        } catch (err) {
          logMessage(`Error preparing pool notification: ${err.message}`, "error", false);
        }
      }, (configOpts.pool.notify.interval || 30) * 1000);
    }
  }

  //*************************************************************//
  //         periodically check if the core has initialized
  //*************************************************************//
  function waitForCoreToInitialize() {
    if (!initialized) {
      let duration = moment.duration(moment().diff(startupTime));

      if (duration.asSeconds() > (configOpts.restart.maxInitTime || 900)) {
        (async () => {
          await restartDaemonProcess("Initialization is taking to long, restarting", true);
        })();
      } else {
        // Validate port number before making request
        const port = Number(configOpts.node.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          logMessage("Invalid port number in configuration", "error", false);
          return;
        }

        // Construct and validate URL using validator
        const localUrl = `http://127.0.0.1:${port}/getinfo`;
        
        if (!validator.isURL(localUrl, { protocols: ['http'], require_protocol: true })) {
          logMessage("Invalid local URL format", "error", false);
          return;
        }
        
        axios.get(localUrl, {
          headers: { 'User-Agent': 'Conceal Node Guardian' },
          timeout: 5000
        }).then(response => {
          // Validate response data
          if (response.data && typeof response.data === 'object' && response.data.status === "OK") {
            logMessage("Core is initialized, starting the periodic checking...", "info", false);
            clearInterval(initInterval);
            initialized = true;

            if (!rpcComms) {
              rpcComms = new RpcCommunicator(configOpts, errorCallback);
            }

            // start comms
            rpcComms.start();
          }
        }).catch(err => {
          // Handle error silently as this is expected during initialization
        });
      }
    }
  }

  //*************************************************************//
  //         start the daemon process and then monitor it
  //*************************************************************//
  function startDaemonProcess() {
    (async () => {
      nodeProcess = execa(getNodeActualPath(cmdOptions, configOpts, rootPath), configOpts.node.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'], // Enable stdin communication
        detached: false, // Keep attached to parent process
        windowsHide: true,
        // Prevent the child from receiving signals when terminal closes
        cleanup: true
      });
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
        (async () => {
          await restartDaemonProcess(`Error on starting the node process: ${err}`, false);
        })();
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
          axios.get('https://api.github.com/repos/ConcealNetwork/conceal-core/releases/latest', {
            headers: { 'User-Agent': 'Conceal Node Guardian' }
          }).then(response => {
            if (response.data.tag_name !== nodeData.version) {
              // stop the daemon
              isUpdating = true;
              self.stop(false);

              let waitStopInteval = setInterval(function () {
                if (nodeProcess == null) {
                  clearInterval(waitStopInteval);

                  downloadLatestDaemon(getNodeActualPath(cmdOptions, configOpts, rootPath), function (error) {
                    if (error) {
                      (async () => {
                        await logMessage(`\nError auto updating daemon: ${error}\n`, "error", true);
                      })();
                    } else {
                      (async () => {
                        await logMessage("The deamon was automatically updated", "info", true);
                      })();
                    }

                    // start the daemon 
                    startDaemonProcess();
                    isUpdating = false;
                  });
                }
              }, 1000);
            }
          }).catch(err => {
            (async () => {
              await logMessage(`\nError auto updating daemon: ${err}\n`, "error", true);
            })();
            isUpdating = false;
          });
        }
      }
    }, 3600000);
  }

  // create a server object if required, its used
  // for servicing API calls for the current node
  if (configOpts.api && configOpts.api.port) {
    logMessage("Starting the API server", "info", false);
    var nodeDirectory = path.dirname(getNodeActualPath(cmdOptions, configOpts, rootPath));
    createServer(configOpts, nodeDirectory, async function () {
      try {
        return await getNodeInfoData();
      } catch (err) {
        logMessage(`Error in API server callback: ${err.message}`, "error", false);
        return null;
      }
    });
  }

  // start the process
  (async () => {
    await logMessage("Starting the guardian", "info", false);
  })();
  startDaemonProcess();
};