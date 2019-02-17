// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const child_process = require('child_process');
const readline = require('readline');
const appRoot = require('app-root-path');
const moment = require('moment');
const path = require('path');
const CCX = require('conceal-js');
const fs = require('fs');
const os = require('os');

const RpcCommunicator = function(configOpts, errorCallback) {
  // create the CCX api interface object
  var CCXApi = new CCX('http://127.0.0.1', '3333', configOpts.node.port);
  var IsRunning = false;
  var lastHeight = 0;
  var lastTS = moment();

  this.stop = function() {
    IsRunning = false;
  }

  this.start = function() {
    IsRunning = true;
    checkAliveAndWell();
  }

  function checkAliveAndWell() {
    if (IsRunning) {
      CCXApi.info().then((data) => { 
        var heightIsOK = true;

        if (lastHeight != data.height) {
          lastHeight = data.height;
          lastTS = moment();
        } else {
          var duration = moment.duration(moment().diff(lastTS));

          if (duration.asHours() > configOpts.restart.maxBlockTime) {
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
  if (appRoot.path.indexOf('app.asar') > -1) {
    this.rootPath = path.dirname(appRoot.path);
  } else {
    this.rootPath = appRoot.path;
  }

  // set the daemon path and start the node process
  const daemonPath = path.join(this.rootPath, 'conceald');
  var configOpts = JSON.parse(fs.readFileSync(path.join(this.rootPath, 'config.json'), 'utf8'))
  var nodeProcess = null;
  var RpcComms = null;

  this.stop = function() {
    RpcComms.stop();
    RpcComms.destroy();
    nodeProcess.kill('SIGTERM');
  }

  function errorCallback(errorData) {
    restartDaemonProcess(errorData, true);
  }

  /***************************************************************
        restarts the node if an error occurs automatically
  ***************************************************************/
  function restartDaemonProcess(errorData, sendNotification) {
    this.stop();

    // write every error to a log file for possible later analization
    fs.appendFile(path.join(this.rootPath, 'errorlog.txt'), errorData, function (err) {
    });

    // send notification if specified in the config
    if ((sendNotification) && (configOpts.notify.url)) {

    }

    // start the daemon again
    startDaemonProcess();
  }

  function startDaemonProcess() {
    nodeProcess = child_process.spawn(configOpts.node.path || daemonPath, configOpts.node.args || []);

    if (!nodeProcess) {
      app.quit();
    } else {
      nodeProcess.on('error', function(err) {      
        restartDaemonProcess("Error on starting the node process", false);
      });
      nodeProcess.stderr.on('data', function(data) {
        restartDaemonProcess(data.toString(), true);
      });
      nodeProcess.on('close', function(err) {      
        restartDaemonProcess("Node process closed with: " + err, true);
      });
  
      const rl = readline.createInterface({
        input: nodeProcess.stdout
      });
            
      rl.on('line', (line) => {
        // core is initialized, we can start the queries
        if (line.indexOf("Core initialized OK") > -1) {
          RpcComms = new RpcCommunicator(configOpts, errorCallback);
          RpcComms.start();
        }
      });
    }
  }

  // start the process
  startDaemonProcess();
}

process.on('exit', function() {
  guardInstance.stop();
});

var guardInstance = new NodeGuard();