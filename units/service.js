// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import xmlbuilder from "xmlbuilder";
import { username } from "username";
import format from "string-template";
import { execa } from "execa";
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
          execa('cgservice.exe', ['install'], { reject: false });
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
          execa('systemctl', ['daemon-reload'], { reject: false });
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
      execa('cgservice.exe', ['uninstall'], { reject: false });
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
      execa('cgservice.exe', ['start'], { reject: false });
    } else if (process.platform == "linux") {
      execa('systemctl', ['start', 'ccx-guardian'], { reject: false });
      execa('systemctl', ['status', 'ccx-guardian'], { reject: false });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};

export function stop(configOpts, configFileName, callback) {
  if (!callback) {
    // No callback - just stop and return
    try {
      if (process.platform == "win32") {
        execa('cgservice.exe', ['stop'], { reject: false });
      } else if (process.platform == "linux") {
        execa('systemctl', ['stop', 'ccx-guardian'], { reject: false });
      } else {
        console.log("\nPlatform is not supported!\n");
      }
    } catch (err) {
      console.log(err.message);
    }
    return;
  }

  // With callback - stop and wait for completion
  try {
    if (process.platform == "win32") {
      execa('cgservice.exe', ['stop'], { reject: false }).then(({ stdout, exitCode }) => {
        if (exitCode === 0) {
          callback();
        } else {
          callback(new Error("Error stopping guardian: " + stdout));
        }
      });
    } else if (process.platform == "linux") {
      execa('systemctl', ['stop', 'ccx-guardian'], { reject: false }).then(({ stdout, exitCode }) => {
        if (exitCode === 0) {
          callback();
        } else {
          callback(new Error("Error stopping guardian: " + stdout));
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
      callback(new Error("Platform not supported"));
      return;
    }

    // Check status every 5 seconds, timeout after 1 minute
    let attempts = 0;
    const maxAttempts = 12; // 12 x 5 seconds = 1 minute
    
    const checkStatus = () => {
      attempts++;
      
      if (process.platform == "win32") {
        // Windows status check
        execa('cgservice.exe', ['status'], { reject: false }).then(({ stdout, exitCode }) => {
          if (stdout.includes('stopped') || stdout.includes('not running')) {
            callback(); // Service stopped successfully
          } else if (attempts >= maxAttempts) {
            callback(new Error("Error stopping guardian: timeout after 1 minute"));
          } else {
            setTimeout(checkStatus, 5000); // Check again in 5 seconds
          }
        });
      } else if (process.platform == "linux") {
        // Linux status check
        execa('systemctl', ['is-active', 'ccx-guardian.service'], { reject: false }).then(({ stdout, exitCode }) => {
          if (stdout.trim() === 'inactive') {
            callback(); // Service stopped successfully
          } else if (attempts >= maxAttempts) {
            callback(new Error("Error stopping guardian: timeout after 1 minute"));
          } else {
            setTimeout(checkStatus, 5000); // Check again in 5 seconds
          }
        });
      }
    };
    // Start checking status
    setTimeout(checkStatus, 5000); // First check after 5 seconds

  } catch (err) {
    console.log(err.message);
    callback(err);
  }
};

export function status(configOpts, configFileName) {
  try {
    if (process.platform == "win32") {
      execa('cgservice.exe', ['status'], { reject: false }).then(({ stdout, exitCode }) => {
        console.log("Guardian Service Status:");
        console.log(stdout);
      }).catch(error => {
        console.log("Error checking status:", error.message);
      });
    } else if (process.platform == "linux") {
      execa('systemctl', ['is-active', 'ccx-guardian.service'], { reject: false }).then(({ stdout, exitCode }) => {
        const status = stdout.trim();
        console.log("Guardian Service Status:", status);
        
        if (status === 'active') {
          console.log("✓ Service is running");
        } else if (status === 'inactive') {
          console.log("✗ Service is stopped");
        } else if (status === 'activating') {
          console.log("⟳ Service is starting...");
        } else if (status === 'deactivating') {
          console.log("⟳ Service is stopping...");
        } else {
          console.log("? Service status unknown:", status);
        }
      }).catch(error => {
        console.log("Error checking status:", error.message);
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
};