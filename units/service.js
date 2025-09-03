// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import xmlbuilder from "xmlbuilder";
import { username } from "username";
import format from "string-template";
import { execa } from "execa";
import { spinner } from './utils.js';
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
      // Configure WinSW to use stopwait for graceful shutdown
      xmlFile.ele('stoptimeout', '30000');

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

  // With callback - first check if already stopped, then stop if needed
  const checkStatus = async () => {
    const maxAttempts = 12; // 12 x 5 seconds = 1 minute
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (process.platform == "win32") {
        // Windows status check
        try {
          const { stdout, exitCode } = await execa('cgservice.exe', ['status'], { reject: false });
          if (stdout.includes('stopped') || stdout.includes('not running')) {
            // Service is already stopped
            callback();
            break;
          } else {
            // Service is still running, need to stop it
            if (attempts === 0) {
              // First attempt - stop the service
              console.log('Service is running, stopping it...');
              const stopResult = await execa('cgservice.exe', ['stop'], { reject: false });
              if (stopResult.exitCode !== 0) {
                callback(new Error("Error stopping guardian: " + stopResult.stdout));
                break;
              }
            }
          }
        } catch (err) {
          callback(new Error("Error checking Windows service status: " + err.message));
          break;
        }
      } else if (process.platform == "linux") {
        // Linux status check
        try {
          const { stdout, exitCode } = await execa('systemctl', ['is-active', 'ccx-guardian.service'], { reject: false });
          if (stdout.trim() === 'inactive') {
            // Service is already stopped
            callback();
            break;
          } else {
            // Service is still running, need to stop it
            if (attempts === 0) {
              // First attempt - stop the service
              console.log('Service is running, stopping it...');
              const stopResult = await execa('systemctl', ['stop', 'ccx-guardian'], { reject: false });
              if (stopResult.exitCode !== 0) {
                callback(new Error("Error stopping guardian: " + stopResult.stdout));
                break;
              }
            }
          }
        } catch (err) {
          callback(new Error("Error checking Linux service status: " + err.message));
          break;
        }
      } else {
        console.log("\nPlatform is not supported!\n");
        callback(new Error("Platform not supported"));
        break;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        callback(new Error("Error stopping guardian: timeout after 1 minute"));
        break;
      }
      
      // Show spinning cursor while waiting
      await spinner(5, "Waiting for service to stop...");
    }
  };

  // Start the status checking process
  checkStatus().catch(err => {
    console.log(err.message);
    callback(err);
  });
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