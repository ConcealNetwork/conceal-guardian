// Copyright (c) 2019-2026, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import format from "string-template";
import { usernameSync } from "username";
import xmlbuilder from "xmlbuilder";
import { spinner } from "./utils.js";

export function install(_configOpts, configFileName) {
  try {
    if (process.platform === "win32") {
      const xmlFile = xmlbuilder.create("configuration");
      xmlFile.ele("id", "ConcealGuardian");
      xmlFile.ele("name", "Conceal Guardian");
      xmlFile.ele("description", "Conceal Guardian for monitoring the Conceal Daemon");
      xmlFile.ele("executable", path.join(process.cwd(), "guardian-win64.exe"));
      xmlFile.ele("arguments", `--config ${configFileName}`);
      // Configure WinSW to use stopwait for graceful shutdown
      xmlFile.ele("stoptimeout", "30000");

      fs.writeFile("cgservice.xml", xmlFile.end({ pretty: true }), (err) => {
        if (err) {
          console.log(`\nError trying to save the XML: ${err}`);
        } else {
          execa("cgservice.exe", ["install"], { reject: false });
        }
      });
    } else if (process.platform === "linux") {
      const template = fs.readFileSync("ccx-guardian.service.template", "utf8");
      const parsedData = format(template, {
        user: usernameSync() || os.userInfo().username,
        workDir: process.cwd(),
        execPath: path.join(process.cwd(), "guardian-linux64"),
        configPath: configFileName,
      });

      fs.writeFile("/etc/systemd/system/ccx-guardian.service", parsedData, (err) => {
        if (err) {
          console.log(`\nError trying to save the service file: ${err}`);
        } else {
          console.log("\nService is succesfully installed.\n");
          execa("systemctl", ["daemon-reload"], { reject: false });
          execa("systemctl", ["enable", "ccx-guardian"], { reject: false });
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
}

export function remove(_configOpts, _configFileName) {
  try {
    if (process.platform === "win32") {
      execa("cgservice.exe", ["uninstall"], { reject: false });
    } else if (process.platform === "linux") {
      fs.unlink("/etc/systemd/system/ccx-guardian.service", (err) => {
        if (err) {
          console.log(`\nError trying to remove the service: ${err}`);
        } else {
          console.log("\nService is succesfully removed.\n");
        }
      });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
}

export function start(_configOpts, _configFileName) {
  try {
    if (process.platform === "win32") {
      execa("cgservice.exe", ["start"], { reject: false });
    } else if (process.platform === "linux") {
      execa("systemctl", ["start", "ccx-guardian"], { reject: false });
      execa("systemctl", ["status", "ccx-guardian"], { reject: false });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
}

export function stop(_configOpts, _configFileName, callback) {
  if (!callback) {
    // No callback - just stop and return
    try {
      if (process.platform === "win32") {
        execa("cgservice.exe", ["stop"], { reject: false });
      } else if (process.platform === "linux") {
        execa("systemctl", ["stop", "ccx-guardian"], { reject: false });
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
      if (process.platform === "win32") {
        // Windows status check
        try {
          const { stdout } = await execa("cgservice.exe", ["status"], { reject: false });
          if (stdout.includes("stopped") || stdout.includes("not running")) {
            // Service is already stopped
            callback();
            break;
          } else {
            // Service is still running, need to stop it
            if (attempts === 0) {
              // First attempt - stop the service
              console.log("Service is running, stopping it...");
              const stopResult = await execa("cgservice.exe", ["stop"], { reject: false });
              if (stopResult.exitCode !== 0) {
                callback(new Error(`Error stopping guardian: ${stopResult.stdout}`));
                break;
              }
            }
          }
        } catch (err) {
          callback(new Error(`Error checking Windows service status: ${err.message}`));
          break;
        }
      } else if (process.platform === "linux") {
        // Linux status check
        try {
          const { stdout } = await execa("systemctl", ["is-active", "ccx-guardian.service"], {
            reject: false,
          });
          if (stdout.trim() === "inactive") {
            // Service is already stopped
            callback();
            break;
          } else {
            // Service is still running, need to stop it
            if (attempts === 0) {
              // First attempt - stop the service
              console.log("Service is running, stopping it...");
              const stopResult = await execa("systemctl", ["stop", "ccx-guardian"], {
                reject: false,
              });
              if (stopResult.exitCode !== 0) {
                callback(new Error(`Error stopping guardian: ${stopResult.stdout}`));
                break;
              }
            }
          }
        } catch (err) {
          callback(new Error(`Error checking Linux service status: ${err.message}`));
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
  checkStatus().catch((err) => {
    console.log(err.message);
    callback(err);
  });
}

export function status(_configOpts, _configFileName) {
  try {
    if (process.platform === "win32") {
      execa("cgservice.exe", ["status"], { reject: false })
        .then(({ stdout }) => {
          console.log("Guardian Service Status:");
          console.log(stdout);
        })
        .catch((error) => {
          console.log("Error checking status:", error.message);
        });
    } else if (process.platform === "linux") {
      execa("systemctl", ["is-active", "ccx-guardian.service"], { reject: false })
        .then(({ stdout }) => {
          const serviceStatus = stdout.trim();
          console.log("Guardian Service Status:", serviceStatus);

          if (serviceStatus === "active") {
            console.log("✓ Service is running");
          } else if (serviceStatus === "inactive") {
            console.log("✗ Service is stopped");
          } else if (serviceStatus === "activating") {
            console.log("⟳ Service is starting...");
          } else if (serviceStatus === "deactivating") {
            console.log("⟳ Service is stopping...");
          } else {
            console.log("? Service status unknown:", serviceStatus);
          }
        })
        .catch((error) => {
          console.log("Error checking status:", error.message);
        });
    } else {
      console.log("\nPlatform is not supported!\n");
    }
  } catch (err) {
    console.log(err.message);
  }
}
