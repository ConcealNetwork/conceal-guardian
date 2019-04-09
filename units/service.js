// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const xmlbuilder = require("xmlbuilder");
const format = require("string-template");
const shell = require("shelljs");
const path = require("path");
const fs = require("fs");
const os = require("os");

// export functions
module.exports = {
  install: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      var xmlFile = xmlbuilder.create('configuration');
      xmlFile.ele('id', 'ConcealGuardian');
      xmlFile.ele('name', 'Conceal Guardian');
      xmlFile.ele('description', 'Conceal Guardian for monitoring the Conceal Daemon');
      xmlFile.ele('executable', path.join(process.cwd(), 'guardian-win64.exe'));
      xmlFile.ele('arguments', '--config ' + configFileName);

      fs.writeFile("cgservice.xml", xmlFile.end({ pretty: true }), function (err) {
        if (err) {
          console.log('\nError trying to save the XML: ' + err);
        } else {
          shell.exec('cgservice.exe install');
        }
      });
    } else if (process.platform == "linux") {
      var template = fs.readFileSync("ccx-guardian.service.template", "utf8");
      var parsedData = format(template, {
        user: os.userInfo().username,
        workDir: process.cwd(),
        execPath: path.join(process.cwd(), 'guardian-linux64'),
        configPath: configFileName
      });

      fs.writeFile("/etc/systemd/system/ccx-guardian.service", parsedData, function (err) {
        if (err) {
          console.log('\nError trying to save the service file: ' + err);
        } else {
          console.log('\nService is succesfully installed.\n');
          shell.exec('systemctl daemon-reload');
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  },
  remove: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      shell.exec('cgservice.exe uninstall');
    } else if (process.platform == "linux") {
      fs.unlink("/etc/systemd/system/ccx-guardian.service", function (err) {
        if (err) {
          console.log('\nError trying to remove the service: ' + err);
        } else {
          console.log('\nService is succesfully removed.\n');
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  },
  start: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      shell.exec('cgservice.exe start');
    } else if (process.platform == "linux") {
      shell.exec('systemctl start ccx-guardian');
      shell.exec('systemctl status ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  },
  stop: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      shell.exec('cgservice.exe stop');
    } else if (process.platform == "linux") {
      shell.exec('systemctl stop ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  },
  status: function (configOpts, configFileName) {
    if (process.platform == "win32") {
      shell.exec('cgservice.exe status');
    } else if (process.platform == "linux") {
      shell.exec('systemctl status ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  }
};