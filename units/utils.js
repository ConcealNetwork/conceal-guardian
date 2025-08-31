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
  const nodeDataFile = path.join(ensureUserDataDir(), "nodedata.json");
  const tempFile = `${nodeDataFile}.tmp`;
  let nodeData = null;

  // Try to read existing file first
  try {
    nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
    return nodeData.id;
  } catch (e) {
    // File doesn't exist, create it atomically
    nodeData = {
      id: new UUID(4).format()
    };

    // Ensure directory exists
    const dir = path.dirname(nodeDataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to a temporary file first
    try {
      fs.writeFileSync(tempFile, JSON.stringify(nodeData), { mode: 0o664 });
      
      // Atomically rename the temp file to the final file
      try {
        fs.renameSync(tempFile, nodeDataFile);
        console.log(`File created successfully: ${nodeDataFile}`);
        return nodeData.id;
      } catch (renameError) {
        // If rename fails, it means someone try to create the file outside of this process, so we need to overwrite the existing file
        if (fs.existsSync(nodeDataFile)) {
          console.log(`File already exists, overwriting: ${nodeDataFile}`);
          fs.copyFileSync(tempFile, nodeDataFile);
          return nodeData.id;
        } else {
          // If rename failed and final file doesn't exist, throw the error
          console.error(`Failed to rename temp file: ${renameError.message}`);
          throw renameError;
        }
      }
    } catch (writeError) {
      // Clean up the temp file if something went wrong
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      console.error(`Failed to write temp file: ${writeError.message}`);
      throw writeError;
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
  return path.basename(process.argv[0]);
};