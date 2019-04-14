// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const downloadRelease = require('download-github-release');
const extractZIP = require('extract-zip');
const extractTAR = require('tar');
const tempDir = require('temp-dir');
const utils = require("./utils.js");
const shell = require("shelljs");
const path = require("path");
const fs = require("fs");

// Define a function to filter releases.
function filterRelease(release) {
  return release.prerelease === false;
}

// Define a function to filter assets.
function filterAssetNode(asset) {
  if (process.platform === "win32") {
    return asset.name.indexOf('win64') >= 0;
  } else if (process.platform === "linux") {
    return asset.name.indexOf('ubuntu') >= 0;
  } else if (process.platform === "darwin") {
    return asset.name.indexOf('macOS') >= 0;
  } else {
    return false;
  }
}

function filterAssetGuardian(asset) {
  if (process.platform === "win32") {
    return asset.name.indexOf('win64') >= 0;
  } else if (process.platform === "linux") {
    return asset.name.indexOf('linux64') >= 0;
  } else if (process.platform === "darwin") {
    return asset.name.indexOf('mac64') >= 0;
  } else {
    return false;
  }
}

function extractArchive(filePath, outDir, callback) {
  if (process.platform === "win32") {
    extractZIP(filePath, { dir: outDir }, function (err) {
      if (err) {
        callback(false);
      } else {
        callback(true);
      }
    });
  } else if (process.platform === "linux") {
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

module.exports = {
  downloadLatestDaemon: function (nodePath, callback) {
    var finalTempDir = path.join(tempDir, utils.ensureNodeUniqueId());
    shell.rm('-rf', finalTempDir);
    shell.mkdir('-p', finalTempDir);

    downloadRelease('ConcealNetwork', 'conceal-core', finalTempDir, filterRelease, filterAssetNode, true)
      .then(function () {
        fs.readdir(finalTempDir, function (err, items) {
          if (items.length > 0) {
            extractArchive(path.join(finalTempDir, items[0]), finalTempDir, function (success) {
              if (success) {
                shell.rm('-rf', path.join(finalTempDir, items[0]));

                fs.readdir(finalTempDir, function (err, items) {
                  if (items.length > 0) {
                    if (process.platform === "win32") {
                      shell.cp(path.join(finalTempDir, utils.getNodeExecutableName()), path.dirname(nodePath));
                    } else {
                      shell.cp(path.join(finalTempDir, items[0], utils.getNodeExecutableName()), path.dirname(nodePath));
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
      })
      .catch(function (err) {
        callback(err.message);
      });
  },
  downloadLatestGuardian: function (nodePath, callback) {
    var finalTempDir = path.join(tempDir, utils.ensureNodeUniqueId());
    shell.rm('-rf', finalTempDir);
    shell.mkdir('-p', finalTempDir);

    downloadRelease('ConcealNetwork', 'conceal-guardian', finalTempDir, filterRelease, filterAssetGuardian, true)
      .then(function () {
        fs.readdir(finalTempDir, function (err, items) {
          if (items.length > 0) {
            extractArchive(path.join(finalTempDir, items[0]), finalTempDir, function (success) {
              if (success) {
                var executableName = utils.getGuardianExecutableName();
                var extensionPos = executableName.lastIndexOf(".");
                var backupName = executableName.substr(0, extensionPos < 0 ? executableName.length : extensionPos) + ".old";

                shell.mv(path.join(process.cwd(), utils.getGuardianExecutableName()), path.join(process.cwd(), backupName));
                shell.cp(path.join(finalTempDir, executableName), process.cwd());
                shell.rm('-rf', finalTempDir);
                shell.chmod('+x', nodePath);
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
  }
};