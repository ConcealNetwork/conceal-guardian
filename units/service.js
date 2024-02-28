// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { exec } from "child_process";
import xmlbuilder from "xmlbuilder";
import { username } from "username";
import format from "string-template";
import path from "path";
import fs from "fs";
import os from "os";

export function install(configOpts, configFileName) {
  try {
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
          exec('cgservice.exe install');
        }
      });
    } else if (process.platform == "linux") {
      var template = fs.readFileSync("ccx-guardian.service.template", "utf8");
      var parsedData = format(template, {
        user: username.sync(),
        workDir: process.cwd(),
        execPath: path.join(process.cwd(), 'guardian-linux64'),
        configPath: configFileName
      });

      fs.writeFile("/etc/systemd/system/ccx-guardian.service", parsedData, function (err) {
        if (err) {
          console.log('\nError trying to save the service file: ' + err);
        } else {
          console.log('\nService is succesfully installed.\n');
          exec('systemctl daemon-reload');
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};

export function remove(configOpts, configFileName) {
  try {
    if (process.platform == "win32") {
      exec('cgservice.exe uninstall');
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
  } catch (err) {
    console.log(err.message);
  }
};

export function start(configOpts, configFileName) {
  try {
    if (process.platform == "win32") {
      exec('cgservice.exe start');
    } else if (process.platform == "linux") {
      exec('systemctl start ccx-guardian');
      exec('systemctl status ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};

export function stop(configOpts, configFileName) {
  try {
    if (process.platform == "win32") {
      exec('cgservice.exe stop');
    } else if (process.platform == "linux") {
      exec('systemctl stop ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};

export function status(configOpts, configFileName) {
  try {
    if (process.platform == "win32") {
      exec('cgservice.exe status');
    } else if (process.platform == "linux") {
      exec('systemctl status ccx-guardian');
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};