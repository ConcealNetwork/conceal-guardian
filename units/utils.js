// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import UUID from "pure-uuid";
import path from "path";
import fs from "fs";

export function ensureUserDataDir() {
  var userDataDir = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Application Support" : process.env.HOME + "/.local/share");
  userDataDir = path.join(userDataDir, "ccxNodeGuard");

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  return userDataDir;
};

export function ensureNodeUniqueId() {
  var nodeDataFile = path.join(ensureUserDataDir(), "nodedata.json");
  var nodeData = null;

  // Try to read existing file first
  try {
    nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
    return nodeData.id;
  } catch (e) {
    // File doesn't exist, create it atomically
    nodeData = {
      id: new UUID(4).format()
    };
    
    // Use file descriptor to avoid race condition
    try {
      const fd = fs.openSync(nodeDataFile, fs.O_CREAT | fs.O_EXCL | fs.O_WRONLY, 0o600);
      fs.writeFileSync(fd, JSON.stringify(nodeData), "utf8");
      fs.closeSync(fd);
    } catch (e) {
      // File was created by another process between read and write
      // Read the existing file instead
      nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
    }
    
    return nodeData.id;
  }
};

export function getNodeActualPath(cmdOptions, configOpts, rootPath) {
  const daemonPath = cmdOptions.daemon || path.join(rootPath, getNodeExecutableName());
  return (configOpts.node.path || daemonPath);
};

export function getNodeExecutableName() {
  if (process.platform === "win32") {
    return 'conceald.exe';
  } else {
    return 'conceald';
  }
};

export function getGuardianExecutableName() {
  if (process.platform === "win32") {
    return 'guardian-win64.exe';
  } else if (process.platform === "linux") {
    return 'guardian-linux64';
  }
  else {
    return 'guardian-macos64';
  }
};