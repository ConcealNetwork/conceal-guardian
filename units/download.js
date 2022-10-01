// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { ensureNodeUniqueId, getNodeExecutableName, getGuardianExecutableName } from "./utils.js";
import downloadRelease from "download-github-release";
import extractZIP from "extract-zip";
import extractTAR from "tar";
import osInfo from "linux-os-info";
import tempDir from "temp-dir";
import shell from "shelljs";
import path from "path";
import fs from "fs";

// a message if you are on the wrong OS and there is no precompiled binaries for that OS.
const wrongLinuxOSMsg = "Only Ubuntu (18.04, 18.10) and (20.04, 20.10) have precompiled binaries, on other linux systems you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";
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
    var finalTempDir = path.join(tempDir, ensureNodeUniqueId());
    var linuxOSInfo = null;

    if (fs.existsSync(finalTempDir)) {
      shell.rm('-rf', finalTempDir);
    }

    // create the temp dir again
    shell.mkdir('-p', finalTempDir);

    // only for linux try to get it
    if (process.platform === "linux") {
      linuxOSInfo = osInfo({ mode: 'sync' });
      // if we are running on linux, print the version and flavor
      console.log(`Running on ${linuxOSInfo.pretty_name}`);

      if (linuxOSInfo.id == "ubuntu") {
        if ((linuxOSInfo.version_id !== "18.04") && (linuxOSInfo.version_id !== "18.10") && (linuxOSInfo.version_id !== "20.04") && (linuxOSInfo.version_id !== "20.10")) {
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
        if ((linuxOSInfo.id == "ubuntu") && ((linuxOSInfo.version_id == "18.04") || (linuxOSInfo.version_id == "18.10"))) {
          return asset.name.indexOf('ubuntu-1804') >= 0;
        } else if ((linuxOSInfo.id == "ubuntu") && ((linuxOSInfo.version_id == "20.04") || (linuxOSInfo.version_id == "20.10"))) {
          return asset.name.indexOf('ubuntu-2004') >= 0;
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
              shell.rm('-rf', path.join(finalTempDir, items[0]));

              fs.readdir(finalTempDir, function (err, items) {
                if (items.length > 0) {
                  if (process.platform === "win32") {
                    shell.cp(path.join(finalTempDir, getNodeExecutableName()), path.dirname(nodePath));
                  } else {
                    shell.cp(path.join(finalTempDir, items[0], getNodeExecutableName()), path.dirname(nodePath));
                  }
                  shell.rm('-rf', finalTempDir);
                  shell.chmod('+x', nodePath);
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
  var finalTempDir = path.join(tempDir, ensureNodeUniqueId());

  if (!fs.existsSync(tempDir)) {
    shell.mkdir('-p', tempDir);
  }

  // remove and remake the dir
  shell.rm('-rf', finalTempDir);
  shell.mkdir('-p', finalTempDir);

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

  downloadRelease('ConcealNetwork', 'conceal-guardian', finalTempDir, filterRelease, filterAssetGuardian, true)
    .then(function () {
      fs.readdir(finalTempDir, function (err, items) {
        if (items.length > 0) {
          extractArchive(path.join(finalTempDir, items[0]), finalTempDir, function (success) {
            if (success) {
              shell.rm(path.join(finalTempDir, '*.zip'));
              shell.rm(path.join(finalTempDir, '*.tar'));
              shell.rm(path.join(finalTempDir, '*.gz'));

              // check for files we need to exclude
              if (fs.existsSync(path.join(finalTempDir, 'exclude.txt'))) {
                fs.readFileSync(path.join(finalTempDir, 'exclude.txt'), 'utf-8').split(/\r?\n/).forEach(function (line) {
                  shell.rm(path.join(finalTempDir, line));
                });
              }

              var executableName = getGuardianExecutableName();
              var extensionPos = executableName.lastIndexOf(".");

              // get the backup name for the old file and rename it to that name
              var backupName = executableName.substr(0, extensionPos < 0 ? executableName.length : extensionPos) + ".old";

              shell.mv(path.join(process.cwd(), getGuardianExecutableName()), path.join(process.cwd(), backupName));
              shell.cp('-rf', path.join(finalTempDir, '*'), process.cwd());
              shell.chmod('+x', process.cwd());
              shell.rm('-rf', finalTempDir);
              callback(null);
            } else {
              callback("Failed to extract the archive");
            }
          });
        } else {
          callback("No downloaded archives found");
        }
      });
    })
    .catch(function (err) {
      callback(err.message);
    });
};
