// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const downloadRelease = require('download-github-release');
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

module.exports = {
  downloadLatestDaemon: function (nodePath, callback) {
    var finalTempDir = path.join(tempDir, utils.ensureNodeUniqueId());
    shell.mkdir('-p', finalTempDir);

    downloadRelease('ConcealNetwork', 'conceal-core', finalTempDir, filterRelease, filterAssetNode, false)
      .then(function () {
        shell.cp(path.join(finalTempDir, utils.getNodeExecutableName()), path.dirname(nodePath));
        shell.rm('-rf', finalTempDir);
        shell.chmod('+x', nodePath);
        callback(null);
      })
      .catch(function (err) {
        callback(err.message);
      });
  },
  downloadLatestGuardian: function (nodePath, callback) {
    var finalTempDir = path.join(tempDir, utils.ensureNodeUniqueId());
    shell.mkdir('-p', finalTempDir);

    downloadRelease('ConcealNetwork', 'conceal-guardian', finalTempDir, filterRelease, filterAssetGuardian, false)
      .then(function () {
        var executableName = utils.getGuardianExecutableName();
        var extensionPos = executableName.lastIndexOf(".");
        var backupName = executableName.substr(0, extensionPos < 0 ? executableName.length : extensionPos) + ".old";

        shell.mv(path.join(process.cwd(), utils.getGuardianExecutableName()), path.join(process.cwd(), backupName));
        shell.cp(path.join(finalTempDir, executableName), process.cwd());
        shell.rm('-rf', finalTempDir);
        shell.chmod('+x', nodePath);
        callback(null);
      })
      .catch(function (err) {
        callback(err.message);
      });
  }
};