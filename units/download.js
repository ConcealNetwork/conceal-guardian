// Copyright (c) 2019-2024, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { ensureNodeUniqueId, getNodeExecutableName, getGuardianExecutableName } from "./utils.js";
import downloadRelease from "download-github-release";
import extractZIP from "extract-zip";
import extractTAR from "tar";
import osInfo from "linux-os-info";
import path from "path";
import fs from "fs";
import os from "os";

// a message if you are on the wrong OS and there is no precompiled binaries for that OS.
const wrongLinuxOSMsg = "Only Ubuntu (20.04, 20.10) and (22.04, 22.10) have precompiled binaries, on other linux systems you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";
const wrongOSMsg = "This operating system has no precompiled binaries you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";

// Define a function to filter releases.
function filterRelease(release) {
  return release.prerelease === false;
}

function extractArchive(filePath, outDir, callback) {
  if (path.extname(filePath) == '.zip') {
    (async () => {
      try {
        await extractZIP(filePath, { dir: outDir });
        callback(true);
      } catch (err) {
        callback(false);
      }  
    })();  
  } else if ((path.extname(filePath) == '.gz') || (path.extname(filePath) == '.tar')) {
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
    var linuxOSInfo = null;

    if (fs.existsSync(finalTempDir)) {
      fs.rmSync(finalTempDir, { recursive: true, force: true });
    }

    // create the temp dir again
    fs.mkdirSync(finalTempDir, { recursive: true });

    // only for linux try to get it
    if (process.platform === "linux") {
      linuxOSInfo = osInfo({ mode: 'sync' });
      // if we are running on linux, print the version and flavor
      console.log(`Running on ${linuxOSInfo.pretty_name}`);

      if (linuxOSInfo.id == "ubuntu") {
        if ((linuxOSInfo.version_id !== "20.04") && (linuxOSInfo.version_id !== "20.10") && (linuxOSInfo.version_id !== "22.04") && (linuxOSInfo.version_id !== "22.10")) {
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
        if ((linuxOSInfo.id == "ubuntu") && ((linuxOSInfo.version_id == "20.04") || (linuxOSInfo.version_id == "20.10"))) {
          return asset.name.indexOf('ubuntu-2004') >= 0;
        } else if ((linuxOSInfo.id == "ubuntu") && ((linuxOSInfo.version_id == "22.04") || (linuxOSInfo.version_id == "22.10"))) {
          return asset.name.indexOf('ubuntu-2204') >= 0;
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
  var finalTempDir = path.join(os.tmpdir(), ensureNodeUniqueId());

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // remove and remake the dir
  fs.rmSync(finalTempDir, { recursive: true, force: true });
  fs.mkdirSync(finalTempDir, { recursive: true });

  // Define a function to filter assets.
  var filterAssetGuardian = function (asset) {
    if (process.platform === "win32") {
      return asset.name.indexOf('win64') >= 0;
    } else if (process.platform === "linux") {
      return asset.name.indexOf('linux64') >= 0;
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
            fs.rmSync(path.join(finalTempDir, '*.zip'), { force: true });
            fs.rmSync(path.join(finalTempDir, '*.tar'), { force: true });
            fs.rmSync(path.join(finalTempDir, '*.gz'), { force: true });

            // check for files we need to exclude
            if (fs.existsSync(path.join(finalTempDir, 'exclude.txt'))) {
              fs.readFileSync(path.join(finalTempDir, 'exclude.txt'), 'utf-8').split(/\r?\n/).forEach(function (line) {
                fs.rmSync(finalTempDir, { force: true });
              });
            }

            var executableName = getGuardianExecutableName();
            var extensionPos = executableName.lastIndexOf(".");

            // get the backup name for the old file and rename it to that name
            var backupName = executableName.substr(0, extensionPos < 0 ? executableName.length : extensionPos) + ".old";

            fs.renameSync(path.join(process.cwd(), getGuardianExecutableName()), path.join(process.cwd(), backupName));
            fs.cpSync(path.join(finalTempDir, '*'), process.cwd(), { recursive: true, force: true });
            fs.chmodSync(process.cwd(), fs.constants.S_IRWXU);
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
