// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const childProcess = require('child_process');

function os_func() {
  this.execCommand = function (cmd, callback) {
    childProcess.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("\nexec error: " + error);
        return;
      }

      callback(stdout);
    });
  };
}

// create new os opject
const os = new os_func();

// export functions
module.exports = {

  install: function (config) {
    os.execCommand('cgservice.exe install', function (returnvalue) {
      console.log(returnvalue);
    });
  },
  remove: function (config) {
    os.execCommand('cgservice.exe uninstall', function (returnvalue) {
      console.log(returnvalue);
    });
  },
  start: function (config) {
    os.execCommand('cgservice.exe start', function (returnvalue) {
      console.log(returnvalue);
    });
  },
  stop: function (config) {
    os.execCommand('cgservice.exe stop', function (returnvalue) {
      console.log(returnvalue);
    });
  }
};