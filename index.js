// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const child_process = require('child_process');
const vsprintf = require('sprintf-js').vsprintf;
const readline = require('readline');
const appRoot = require('app-root-path');
const request = require('request');
const moment = require('moment');
const path = require('path');
const http = require('http');
const CCX = require('conceal-js');
const fs = require('fs');
const os = require('os');

const RpcCommunicator = function(configOpts, errorCallback) {
  // create the CCX api interface object
  var CCXApi = new CCX('http://127.0.0.1', '3333', configOpts.node.port);
  var IsRunning = false;
  var lastHeight = 0;
  var version = 0;
  var lastTS = moment();

  this.stop = function() {
    IsRunning = false;
  }

  this.getVersion = function() {
    return version;
  }

  this.lastHeight = function() {
    return lastHeight;
  }

  this.start = function() {
    IsRunning = true;
    checkAliveAndWell();
  }

  function checkAliveAndWell() {
    if (IsRunning) {
      CCXApi.info().then((data) => { 
        var heightIsOK = true;
        version = data.version;

        if (lastHeight != data.height) {
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
          if (data.status != "OK") {
            errorCallback("Status is: " + data.status);
          } else {
            setTimeout(() => {
              checkAliveAndWell();
            }, 5000);  
          }  
        }
      }).catch((err) => { 
        errorCallback(err);
      });
    }  
  }
}

const NodeGuard = function () {
  var rootPath = null;
  
  if (appRoot.path.indexOf('app.asar') > -1) {
    rootPath = path.dirname(appRoot.path);
  } else {
    rootPath = appRoot.path;
  }

  // set the daemon path and start the node process
  const daemonPath = path.join(rootPath, 'conceald');
  var configOpts = JSON.parse(fs.readFileSync(path.join(rootPath, 'config.json'), 'utf8'))
  var starupTime = moment();
  var errorCount = 0;
  var initialized = false;
  var nodeProcess = null;
  var RpcComms = null;

  this.stop = function() {
    if (RpcComms) {
      RpcComms.stop();
      RpcComms = null;  
    }

    if (nodeProcess) {
      nodeProcess.kill('SIGTERM');
    }
  }

  function errorCallback(errorData) {
    restartDaemonProcess(errorData, true);
  }

  /***************************************************************
        log the error to text file and send it to Discord
  ***************************************************************/
  function logError(errorMsg, sendNotification) {
    var userDataDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.local/share");
    userDataDir = path.join(userDataDir, "ConcealNodeGuard");

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir); 
    }   

    // write every error to a log file for possible later analization
    fs.appendFile(path.join(userDataDir, 'errorlog.txt'), errorMsg + "\n", function (err) {});

    // send notification if specified in the config
    if ((sendNotification) && (configOpts.notify.url)) {
      var hookOptions = {
        uri: configOpts.notify.url,
        method: 'POST',
        json: {
          "content": vsprintf('Node **%s** reported an error -> %s', [configOpts.node.name || os.hostname(), errorMsg + "\n"])
        }
      }
    
      request(hookOptions, function (error, response, data) {
        // for now its fire and forget, no matter if error occurs
      });    
    }
  }

  /***************************************************************
        restarts the node if an error occurs automatically
  ***************************************************************/
  function restartDaemonProcess(errorData, sendNotification) {
    logError(errorData, sendNotification);

    // increase error count and stop instance
    errorCount = errorCount + 1;
    guardInstance.stop();

    // check if we have crossed the maximum error number in short period
    if (errorCount > (configOpts.restart.maxCloseErrors || 3)) {
      logError("To many errors in a short ammount of time. Stopping.\n", true);
      process.exit(0);
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

  function startDaemonProcess() {
    nodeProcess = child_process.spawn(configOpts.node.path || daemonPath, configOpts.node.args || []);

    if (!nodeProcess) {
      logError("Failed to start the process instance. Stopping.\n", false);
      process.exit(0);
    } else {
      nodeProcess.on('error', function(err) {      
        restartDaemonProcess("Error on starting the node process", false);
      });
      nodeProcess.on('close', function(err) {      
        restartDaemonProcess("Node process closed with: " + err, true);
      });
  
      const dataStream = readline.createInterface({
        input: nodeProcess.stdout
      });
            
      const errorStream = readline.createInterface({
        input: nodeProcess.stderr
      });
         
      function processSingleLine(line) {
        // core is initialized, we can start the queries
        if (line.indexOf("Core initialized OK") > -1) {
          initialized = true;

          RpcComms = new RpcCommunicator(configOpts, errorCallback);
          RpcComms.start();
        }
      }

      dataStream.on('line', (line) => {
        processSingleLine(line);
      });

      errorStream.on('line', (line) => {
        processSingleLine(line);
      });

      // start the initilize checking
      checkIfInitialized();      
    }
  }

  //create a server object if required
  if ((configOpts.api) && (configOpts.api.port)) {
    http.createServer(function (req, res) {
      if (req.url.toUpperCase() == '/GETINFO')
      {
        var statusResponse = {
          status: {
            name: configOpts.node.name || os.hostname(),
            errors: errorCount,
            startTime: starupTime,
            blockHeight: RpcComms ? RpcComms.lastHeight() : '',
            nodeVersion: RpcComms ? RpcComms.getVersion() : 0
          }
        }
    
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Powered-By':'nodejs'
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
  startDaemonProcess();
}

process.on('exit', function() {
  guardInstance.stop();
});

var guardInstance = new NodeGuard();