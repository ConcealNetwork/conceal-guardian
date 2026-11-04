// Copyright (c) 2019-2026, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import moment from "moment";
import UUID from "pure-uuid";

export function ensureUserDataDir() {
  var userDataDir =
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`);
  userDataDir = path.join(userDataDir, "ccxNodeGuard");

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  return userDataDir;
}

/** Same debug.log line format as NodeGuard, for events that happen before it starts. */
export function writeGuardianLog(msgType, msgText) {
  const line = `${moment().format("YYYY-MM-DD hh:mm:ss")}\t${msgType}\t${msgText}\n`;
  try {
    fs.appendFileSync(path.join(ensureUserDataDir(), "debug.log"), line);
  } catch (err) {
    console.error(`Failed to write guardian log: ${err.message}`);
  }
}

export function ensureNodeUniqueId() {
  const nodeDataFile = path.join(ensureUserDataDir(), "nodedata.json");
  const tempFile = `${nodeDataFile}.tmp`;
  let nodeData = null;

  // Try to read existing file first
  try {
    nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
    return nodeData.id;
  } catch {
    // File doesn't exist, create it atomically
    nodeData = {
      id: new UUID(4).format(),
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
  }
}

const UNIX_DAEMON_NAMES = { preferred: "conceal-daemon", legacy: "conceald" };
const WINDOWS_DAEMON_NAMES = { preferred: "conceal-daemon.exe", legacy: "conceald.exe" };

export function nodeDaemonBasenames(platform = process.platform) {
  return platform === "win32" ? WINDOWS_DAEMON_NAMES : UNIX_DAEMON_NAMES;
}

function isRegularFile(filePath, lstatSync) {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function pathExists(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Default daemon basename: prefer conceal-daemon, then conceald.
 * Only a regular file counts. Symlink aliases do not satisfy either name.
 * When neither file exists, the preferred name is returned so a later
 * download can create it. `.partial` and `.previous` siblings are ignored.
 */
export function findRealDaemonBinary(searchDirs, options = {}) {
  const lstatSync = options.lstatSync ?? fs.lstatSync;
  const { preferred, legacy } = nodeDaemonBasenames(options.platform ?? process.platform);
  const names = options.names ?? [preferred, legacy];
  for (const name of names) {
    for (const dir of searchDirs) {
      const candidate = path.join(dir, name);
      if (isRegularFile(candidate, lstatSync)) {
        return candidate;
      }
    }
  }
  return null;
}

export function resolveDefaultDaemonPath(dir, options = {}) {
  const found = findRealDaemonBinary([dir], options);
  if (found) {
    return found;
  }
  return path.join(dir, nodeDaemonBasenames(options.platform ?? process.platform).preferred);
}

/**
 * Directories to scan after an archive extract.
 * Windows release zips place the executable at the archive root.
 * Linux tarballs place it in the first extracted directory.
 * The preferred basename still wins across these directories.
 */
export function daemonExtractSearchDirs(extractRoot, options = {}) {
  const platform = options.platform ?? process.platform;
  const readdirSync = options.readdirSync ?? fs.readdirSync;
  let entries = [];
  try {
    entries = readdirSync(extractRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = [];
  const seen = new Set();
  const add = (dir) => {
    if (!seen.has(dir)) {
      seen.add(dir);
      dirs.push(dir);
    }
  };
  const childDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => path.join(extractRoot, entry.name));

  if (platform === "win32") {
    add(extractRoot);
    for (const dir of childDirs) {
      add(dir);
    }
  } else {
    for (const dir of childDirs) {
      add(dir);
    }
    add(extractRoot);
  }
  return dirs;
}

/**
 * Linux package lookup dirs after the working directory.
 * Packages ship conceal-daemon in /usr/bin. PATH is the `command -v` lookup.
 * /usr/bin comes before PATH. Windows packages are out of scope.
 */
export function defaultDaemonSearchDirs(rootPath, options = {}) {
  const platform = options.platform ?? process.platform;
  const dirs = [];
  const add = (dir) => {
    if (!dir) {
      return;
    }
    const resolved = path.resolve(dir);
    if (!dirs.includes(resolved)) {
      dirs.push(resolved);
    }
  };
  add(rootPath);
  if (platform === "win32") {
    return dirs;
  }
  add("/usr/bin");
  const pathEnv = options.pathEnv ?? process.env.PATH ?? "";
  for (const entry of pathEnv.split(path.delimiter)) {
    add(entry);
  }
  return dirs;
}

/**
 * Launch path precedence:
 * 1. config node.path, even when that path is missing or not executable
 * 2. --daemon, with the same rule
 * 3. conceal-daemon, then conceald, in the working directory
 * 4. conceal-daemon only, in /usr/bin and then PATH
 * 5. the working directory plus conceal-daemon, when no file exists
 * Packages will ship conceal-daemon, not conceald. A packaged path is launched
 * as-is. Updates still install into the working directory.
 */
export function describeNodeLaunch(cmdOptions, configOpts, rootPath, options = {}) {
  const configured = configOpts.node.path;
  if (configured) {
    return { path: configured, explicit: true };
  }
  if (cmdOptions?.daemon) {
    return { path: cmdOptions.daemon, explicit: true };
  }
  const platform = options.platform ?? process.platform;
  const names = nodeDaemonBasenames(platform);
  const searchDirs = options.searchDirs ?? defaultDaemonSearchDirs(rootPath, options);
  const local = findRealDaemonBinary(searchDirs.slice(0, 1), { ...options, platform });
  if (local) {
    return { path: local, explicit: false };
  }
  const packaged = findRealDaemonBinary(searchDirs.slice(1), {
    ...options,
    platform,
    names: [names.preferred],
  });
  if (packaged) {
    return { path: packaged, explicit: false, installDir: rootPath };
  }
  return { path: path.join(rootPath, names.preferred), explicit: false };
}

export function getNodeActualPath(cmdOptions, configOpts, rootPath, options = {}) {
  return describeNodeLaunch(cmdOptions, configOpts, rootPath, options).path;
}

export function getNodeExecutableName(platform = process.platform) {
  return nodeDaemonBasenames(platform).preferred;
}

export function daemonInstallDestination(launch, sourcePath) {
  if (launch.explicit) {
    return launch.path;
  }
  const dir = launch.installDir ?? path.dirname(launch.path);
  return path.join(dir, path.basename(sourcePath));
}

/** Core names the log from the executable: ReplaceExtension(argv[0], ".log"). */
export function daemonLogBasename(daemonPath) {
  const base = path.basename(daemonPath);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${stem}.log`;
}

/**
 * Replace dest with a regular file. The live name is unchanged until rename.
 * On failure after the live file was moved aside, it is moved back.
 * A crash can leave `name.previous` (last good file) or `name.partial` (unused).
 */
export function installDaemonFile(sourcePath, destPath) {
  const sourceStat = fs.lstatSync(sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error(`Refusing to install ${path.basename(sourcePath)}: not a regular file`);
  }

  const partialPath = `${destPath}.partial`;
  const previousPath = `${destPath}.previous`;
  fs.rmSync(partialPath, { force: true });
  fs.copyFileSync(sourcePath, partialPath);
  fs.chmodSync(partialPath, fs.constants.S_IRWXU);

  fs.rmSync(previousPath, { force: true });
  let movedAside = false;
  try {
    if (pathExists(destPath)) {
      fs.renameSync(destPath, previousPath);
      movedAside = true;
    }
    fs.renameSync(partialPath, destPath);
  } catch (err) {
    if (pathExists(partialPath)) {
      fs.rmSync(partialPath, { force: true });
    }
    if (movedAside && pathExists(previousPath) && !pathExists(destPath)) {
      fs.renameSync(previousPath, destPath);
    }
    throw err;
  }
  fs.rmSync(previousPath, { force: true });
}

export function getGuardianExecutableName() {
  return path.basename(process.argv[0]);
}

// Function to swap executable files
export function swapExecutable(tempNewExecutable, executableName, callback) {
  const tempNewExecutablePath = path.join(process.cwd(), tempNewExecutable);
  const executableNamePath = path.join(process.cwd(), executableName);

  // Check if both files exist
  if (!fs.existsSync(tempNewExecutablePath)) {
    callback(`Error updating guardian: ${tempNewExecutable} not found`);
    return;
  }
  if (!fs.existsSync(executableNamePath)) {
    callback(`Error updating guardian: ${executableName} not found`);
    return;
  }
  console.log("Update completed. New executable ready.");
  callback(null);
  const finalExecutableName = path.basename(tempNewExecutablePath).replace(".new", "");

  // Start the swap process and exit immediately
  const swapProcess = () => {
    if (process.platform === "win32") {
      const batchContent = `
timeout /t 5 /nobreak >nul
del "${executableName}"
rename "${tempNewExecutablePath}" "${finalExecutableName}"
del "%~f0"
exit /b 0
`;
      const batchFile = path.join(process.cwd(), "swap.bat");
      fs.writeFileSync(batchFile, batchContent);

      execa("cmd", ["/k", "swap.bat"], {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd(),
      }).unref();
    } else {
      // Linux/Unix: use bash with sleep, delete old, rename new
      execa(
        "bash",
        [
          "-c",
          `sleep 5 && rm "${executableNamePath}" && mv "${tempNewExecutablePath}" "${finalExecutableName}"`,
        ],
        {
          detached: true,
          stdio: "ignore",
        },
      ).unref();
    }
  };

  // Start swap process and wait before exiting
  swapProcess();

  // Give the child process time to start, then exit (so we have a 4 second buffer for swapping)
  setTimeout(() => {
    console.log("Exiting to complete file swap...");
    process.exit(0);
  }, 1000);
}

// Reusable spinner function
export function spinner(durationSeconds, message = "Processing...") {
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spinnerIndex = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${spinnerChars[spinnerIndex]} ${message}`);
      spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r${" ".repeat(message.length + 2)}\r`); // Clear the line
      resolve();
    }, durationSeconds * 1000);
  });
}
