// Copyright (c) 2019-2024, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { ensureNodeUniqueId, getNodeExecutableName, getGuardianExecutableName } from "./utils.js";
import downloadRelease from "download-github-release";
import extractZIP from "extract-zip";
import * as extractTAR from "tar";
import osInfo from "linux-os-info";
import path from "path";
import fs from "fs";
import os from "os";

// a message if you are on the wrong OS and there is no precompiled binaries for that OS.
const wrongLinuxOSMsg = "Only Ubuntu (20.04, 20.10) and (22.04, 22.10) have precompiled binaries, on other linux systems you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";
const supportedUbuntuVersionsCore = ['20.04', '20.10', '22.04', '22.05', '24.04'];
const supportedUbuntuVersionsGuardian = ['20.04', '20.10', '22.04', '22.05', '24.04'];
const wrongOSMsg = "This operating system has no precompiled binaries you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";

// Define a function to filter releases.
function filterRelease(release) {
  return release.prerelease === false;
}

// Define a function to get Linux OS info.
function getLinuxOSInfo() {
  if (process.platform === "linux") {
    const linuxOSInfo = osInfo({ mode: 'sync' });
    console.log(`Running on ${linuxOSInfo.pretty_name}`);
    return linuxOSInfo;
  }
  return null;
}

function extractArchive(filePath, outDir, callback) {
  const fileName = path.basename(filePath);
  
  if (path.extname(filePath) == '.zip') {
    (async () => {
      try {
        await extractZIP(filePath, { dir: outDir });
        callback(true);
      } catch (err) {
        callback(false);
      }  
    })();  
  } else if (fileName.endsWith('.tar.gz') || path.extname(filePath) == '.tar') {
    try {
      extractTAR.x({
        cwd: outDir,
        file: filePath,
        sync: true,
        preservePaths: true
      });
      callback(true);
    } catch (err) {
      callback(false);
    }
  } else {
    callback(false);
  }
}

export function downloadLatestDaemon(nodePath, callback) {
    var finalTempDir = path.join(os.tmpdir(), ensureNodeUniqueId());
    var linuxOSInfo = getLinuxOSInfo();

    if (fs.existsSync(finalTempDir)) {
      fs.rmSync(finalTempDir, { recursive: true, force: true });
    }

    // create the temp dir again
    fs.mkdirSync(finalTempDir, { recursive: true });

    // only for linux try to get it
    if (process.platform === "linux") {
      if (linuxOSInfo.id == "ubuntu") {
        if (!supportedUbuntuVersionsCore.includes(linuxOSInfo.version_id)) {
          callback(wrongLinuxOSMsg);
          return false;
        }
      } else {
        callback(wrongLinuxOSMsg);
        return false;
      }
    } else if (process.platform == "darwin") {
      callback(wrongOSMsg);
      return false;
    }

    // Define a function to filter assets.
    var filterAssetNode = function (asset) {
      if (process.platform === "win32") {
        return asset.name.indexOf('win64') >= 0;
      } else if (process.platform === "linux") {
        if ((linuxOSInfo.id == "ubuntu") && (linuxOSInfo.version_id.startsWith("20"))) {
          return asset.name.indexOf('ubuntu-2004') >= 0;
        } else if ((linuxOSInfo.id == "ubuntu") && (linuxOSInfo.version_id.startsWith("22"))) {
          return asset.name.indexOf('ubuntu-2204') >= 0;
        } else if ((linuxOSInfo.id == "ubuntu") && (linuxOSInfo.version_id.startsWith("24"))) {
          return asset.name.indexOf('ubuntu-2404') >= 0;
        } else {
          return false;
        }
      } else if (process.platform === "darwin") {
        return false;
      } else {
        return false;
      }
    };

    downloadRelease('ConcealNetwork', 'conceal-core', finalTempDir, filterRelease, filterAssetNode, true) .then(function () {
      fs.readdir(finalTempDir, function (err, items) {
        if (items.length > 0) {
          extractArchive(path.join(finalTempDir, items[0]), finalTempDir, function (success) {
            if (success) {
              fs.rmSync(path.join(finalTempDir, items[0]), { recursive: true, force: true });

              fs.readdir(finalTempDir, function (err, items) {
                if (items.length > 0) {
                  if (process.platform === "win32") {
                    let sourceFile = path.join(finalTempDir, getNodeExecutableName());
                    let targetFile = path.join(path.dirname(nodePath), getNodeExecutableName());
                    fs.cpSync(sourceFile, targetFile);
                  } else {
                    let sourceFile = path.join(finalTempDir, items[0], getNodeExecutableName());
                    let targetFile = path.join(path.dirname(nodePath), getNodeExecutableName());
                    fs.cpSync(sourceFile, targetFile);
                  }
                  fs.rmSync(finalTempDir, { recursive: true, force: true });
                  fs.chmodSync(nodePath, fs.constants.S_IRWXU);
                  callback(null);
                } else {
                  callback("No downloaded archives found");
                }
              });
            } else {
              callback("Failed to extract the archive");
            }
          });
        } else {
          callback("No downloaded archives found");
        }
      });
    }).catch(function (err) {
      callback(err.message);
    });
};


export function downloadLatestGuardian(callback) {
  // Check if running via Node.js - updates not supported
  if (getGuardianExecutableName() === 'node') {
    callback("Guardian update not supported when running via Node.js");
    return;
  }
  
  var finalTempDir = path.join(os.tmpdir(), ensureNodeUniqueId());
  var linuxOSInfo = getLinuxOSInfo();
  if (!fs.existsSync(finalTempDir)) {
    fs.mkdirSync(finalTempDir, { recursive: true });
  }

  // remove and remake the dir
  fs.rmSync(finalTempDir, { recursive: true, force: true });
  fs.mkdirSync(finalTempDir, { recursive: true });

  // Define a function to filter assets.
  var filterAssetGuardian = function (asset) {
    if (process.platform === "win32") {
      return asset.name.indexOf('win64') >= 0;
    } else if (process.platform === "linux") {
      if (!supportedUbuntuVersionsGuardian.includes(linuxOSInfo.version_id)) {
        return false;
      } else {
        // Check Ubuntu version and select appropriate asset:
        // - Ubuntu 22.x: use guardian-linux64-ubuntu-22.tar.gz
        // - Ubuntu 24.x: use guardian-linux64-ubuntu-24.tar.gz  
        // - Ubuntu 20.x: use guardian-linux64.tar.gz (generic, no Ubuntu specification)
        if (linuxOSInfo.version_id.startsWith("22")) {
          return asset.name.indexOf('ubuntu-22') >= 0;
        } else if (linuxOSInfo.version_id.startsWith("24")) {
          return asset.name.indexOf('ubuntu-24') >= 0;
        } else {
          return asset.name.indexOf('linux64') >= 0 && asset.name.indexOf('ubuntu-') === -1;
        }
      }
    } else if (process.platform === "darwin") {
      return asset.name.indexOf('mac64') >= 0;
    } else {
      return false;
    }
  };

  downloadRelease('ConcealNetwork', 'conceal-guardian', finalTempDir, filterRelease, filterAssetGuardian, true).then(function () {
    fs.readdir(finalTempDir, function (err, items) {
      if (items.length > 0) {
        extractArchive(path.join(finalTempDir, items[0]), finalTempDir, function (success) {
          if (success) {
            // 1. Backup current executable
            var executableName = getGuardianExecutableName();
            var extensionPos = executableName.lastIndexOf(".");
            var backupName = executableName.substring(0, extensionPos < 0 ? executableName.length : extensionPos) + ".old";
            fs.renameSync(path.join(process.cwd(), executableName), path.join(process.cwd(), backupName));

            // 2. Get list of files to preserve from exclude.txt
            var excludeFiles = [];
            var excludePath = path.join(finalTempDir, 'exclude.txt');
            if (fs.existsSync(excludePath)) {
              excludeFiles = fs.readFileSync(excludePath, 'utf-8').split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            }

            // 3. Clean CWD - remove all files except *.old and excluded files
            fs.readdirSync(process.cwd()).forEach(file => {
              if (!file.endsWith('.old') && !excludeFiles.includes(file)) {
                fs.rmSync(path.join(process.cwd(), file), { recursive: true, force: true });
              }
            });

            // 4. Extract new release directly into CWD (skip excluded files)
            fs.readdirSync(finalTempDir).forEach(file => {
              if (!excludeFiles.includes(file)) {
                var srcPath = path.join(finalTempDir, file);
                var destPath = path.join(process.cwd(), file);
                if (fs.statSync(srcPath).isDirectory()) {
                  fs.cpSync(srcPath, destPath, { recursive: true, force: true });
                } else {
                  fs.cpSync(srcPath, destPath);
                }
              }
            });

            // 5. Set executable permissions on new executable
            fs.readdirSync(process.cwd()).forEach(file => {
              if (file.startsWith('guardian-') && !file.endsWith('.old') && !file.includes('.')) {
                fs.chmodSync(path.join(process.cwd(), file), fs.constants.S_IRWXU);
              }
            });
            fs.rmSync(finalTempDir, { recursive: true, force: true });
            callback(null);
          } else {
            callback("Failed to extract the archive");
          }
        });
      } else {
        callback("No downloaded archives found");
      }
    });
  }).catch(function (err) {
    callback(err.message);
  });
};
