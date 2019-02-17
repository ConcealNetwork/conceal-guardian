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

const RpcCommunicator = function(errorCallback) {
  // create the CCX api interface object
  var CCXApi = new CCX('http://127.0.0.1', '3333', '16000');
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
        if (lastHeight != data.height) {
          lastHeight = data.height;
          lastTS = moment();
        } else {
          var duration = moment.duration(moment().diff(lastTS));

          if (duration.asHours() > 30) {
            errorCallback("No new block has be seen for more then 30 minutes");
          }
        }
  
        if (data.status != "OK") {
          errorCallback("Status is: " + data.status);
        } else {
          setTimeout(() => {
            checkAliveAndWell();
          }, 5000);  
        }
      }).catch((err) => { 
        errorCallback(err);
      });
    }  
  }
}

const NodeGuard = function (opts) {
  this.opts = opts || {}
  var RpcComms = null;

  if (appRoot.path.indexOf('app.asar') > -1) {
    this.rootPath = path.dirname(appRoot.path);
  } else {
    this.rootPath = appRoot.path;
  }

  // set the daemon path and start the node process
  const daemonPath = path.join(this.rootPath, 'conceald');
  var nodeProcess = null;

  this.stop = function() {
    RpcComms.stop();
    RpcComms.destroy();
    nodeProcess.kill('SIGTERM');
  }

  function errorCallback(errorData) {
    nodeProcess.kill('SIGTERM');
    startDaemonProcess();
  }

  function restartDaemonProcess() {
    this.stop();
    startDaemonProcess();
  }

  function startDaemonProcess() {
    nodeProcess = child_process.spawn(daemonPath, ['--rpc-bind-ip', '127.0.0.1', '--rpc-bind-port', '16000']);

    if (!nodeProcess) {
      app.quit();
    } else {
      nodeProcess.on('error', function(err) {      
        restartDaemonProcess();
      });
      nodeProcess.stderr.on('data', function(data) {
        restartDaemonProcess();
      });
      nodeProcess.on('close', function(err) {      
        restartDaemonProcess();
      });
  
      const rl = readline.createInterface({
        input: nodeProcess.stdout
      });
      
      rl.on('line', (line) => {
        if (line.indexOf("Core initialized OK") > -1) {
          RpcComms = new RpcCommunicator(errorCallback);
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

var guardInstance = new NodeGuard(null);