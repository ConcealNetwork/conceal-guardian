// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const childProcess = require('child_process');
const xmlbuilder = require('xmlbuilder');
const path = require("path");
const fs = require("fs");

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
  install: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      var xmlFile = xmlbuilder.create('configuration')
      xmlFile.ele('id', 'ConcealGuardian');
      xmlFile.ele('name', 'Conceal Guardian');
      xmlFile.ele('description', 'Conceal Guardian for monitoring the Conceal Daemon');
      xmlFile.ele('executable', path.join(process.cwd(), 'guardian-win64.exe'));
      xmlFile.ele('arguments', '--config ' + configFileName);

      fs.writeFile("cgservice.xml", xmlFile.end({ pretty: true }), function (err) {
        if (err) {
          console.log('\nError trying to save the XML: ' + err);
        } else {
          os.execCommand('cgservice.exe install', function (returnvalue) {
            console.log(returnvalue);
          });
        }
      });

    } else {
      console.log("\nPlatform is not supported!");
    }
  },
  remove: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      os.execCommand('cgservice.exe uninstall', function (returnvalue) {
        console.log(returnvalue);
      });
    } else {
      console.log("\nPlatform is not supported!");
    }
  },
  start: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      os.execCommand('cgservice.exe start', function (returnvalue) {
        console.log(returnvalue);
      });
    } else {
      console.log("\nPlatform is not supported!");
    }
  },
  stop: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      os.execCommand('cgservice.exe stop', function (returnvalue) {
        console.log(returnvalue);
      });
    } else {
      console.log("\nPlatform is not supported!");
    }
  }
};