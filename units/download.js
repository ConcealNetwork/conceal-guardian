// Copyright (c) 2019-2024, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { BlobReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import osInfo from "linux-os-info";
import * as extractTAR from "tar";
import { ensureNodeUniqueId, getGuardianExecutableName, getNodeExecutableName } from "./utils.js";

// a message if you are on the wrong OS and there is no precompiled binaries for that OS.
const wrongLinuxOSMsg =
  "Only Ubuntu (20.04, 20.10) and (22.04, 22.10) have precompiled binaries, on other linux systems you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";
const supportedUbuntuVersionsCore = ["20.04", "20.10", "22.04", "22.05", "24.04"];
const supportedUbuntuVersionsGuardian = ["20.04", "20.10", "22.04", "22.05", "24.04"];
const wrongOSMsg =
  "This operating system has no precompiled binaries you need to build the daemon yourself. Reffer to: https://github.com/ConcealNetwork/conceal-core";

/**
 * Download matching release assets using native fetch + GitHub Releases API.
 * @param {string} owner - GitHub owner/org
 * @param {string} repo - GitHub repo name
 * @param {string} outputDir - Directory to save downloaded assets
 * @param {Function} filterRelease - Predicate (release) => boolean
 * @param {Function} filterAsset - Predicate (asset) => boolean
 * @returns {Promise<void>}
 */
async function downloadRelease(owner, repo, outputDir, filterRelease, filterAsset) {
  const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
  const response = await fetch(releasesUrl, {
    headers: {
      "User-Agent": "Conceal Node Guardian",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch releases for ${owner}/${repo}: ${response.status} ${response.statusText}`,
    );
  }

  const releases = await response.json();
  // Match old download-github-release getLatest: first filterRelease hit that has ≥1 filterAsset.
  let matchingRelease = null;
  let matchingAssets = [];
  for (const release of releases) {
    if (!filterRelease(release)) {
      continue;
    }
    const assets = release.assets.filter(filterAsset);
    if (assets.length > 0) {
      matchingRelease = release;
      matchingAssets = assets;
      break;
    }
  }

  if (!matchingRelease) {
    throw new Error(
      `could not find a release for ${owner}/${repo} (${os.platform()} ${os.arch()})`,
    );
  }

  // Download all matching assets
  const downloads = matchingAssets.map(async (asset) => {
    const assetResponse = await fetch(asset.browser_download_url, {
      headers: { "User-Agent": "Conceal Node Guardian" },
    });

    if (!assetResponse.ok) {
      throw new Error(
        `Failed to download ${asset.name}: ${assetResponse.status} ${assetResponse.statusText}`,
      );
    }

    const outputPath = path.join(outputDir, asset.name);
    const fileStream = fs.createWriteStream(outputPath);
    const webStream = Readable.fromWeb(assetResponse.body);

    await pipeline(webStream, fileStream);
  });

  await Promise.all(downloads);
}

async function verifyArchiveChecksum(archivePath, owner, repo, tag) {
  const checksumUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/checksums.sha256`;
  const response = await fetch(checksumUrl, { headers: { "User-Agent": "Conceal Node Guardian" } });
  if (!response.ok) {
    throw new Error(
      `No checksums.sha256 found for ${owner}/${repo} release ${tag} — cannot verify archive integrity`,
    );
  }
  const checksumText = await response.text();
  const archiveName = path.basename(archivePath);
  const matchLine = checksumText.split("\n").find((line) => line.includes(archiveName));
  if (!matchLine) {
    throw new Error(`No checksum entry for ${archiveName} in checksums.sha256 (release ${tag})`);
  }
  const expectedHash = matchLine.split(/\s+/)[0].toLowerCase();
  const fileBuffer = fs.readFileSync(archivePath);
  const actualHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(
      `Integrity check FAILED for ${archiveName}: expected ${expectedHash}, got ${actualHash}`,
    );
  }
}

// Define a function to filter releases.
function filterRelease(release) {
  return release.prerelease === false;
}

// Define a function to get Linux OS info.
function getLinuxOSInfo() {
  if (process.platform === "linux") {
    const linuxOSInfo = osInfo({ mode: "sync" });
    console.log(`Running on ${linuxOSInfo.pretty_name}`);
    return linuxOSInfo;
  }
  return null;
}

/** Per-entry uncompressed size cap (release binaries; blocks zip bombs / OOM). */
const MAX_ZIP_ENTRY_BYTES = 512 * 1024 * 1024;

/**
 * Safely extract a zip archive with explicit Zip Slip / path / symlink safety checks.
 * @param {string} zipPath - Path to the zip file
 * @param {string} outDir - Target extraction directory
 * @throws {Error} If any entry is unsafe (symlink, absolute path, contains .., or escapes outDir)
 */
async function extractZipSafe(zipPath, outDir) {
  const normalizedOutDir = path.resolve(outDir);
  const realOutDir = await fs.promises.realpath(normalizedOutDir);

  if (!fs.openAsBlob) {
    throw new Error("Zip extraction requires Node.js fs.openAsBlob (Node 20+)");
  }
  const zipBlob = await fs.openAsBlob(zipPath);

  const reader = new BlobReader(zipBlob);
  const zipReader = new ZipReader(reader, {
    // Rejects ".." and absolute paths at parse time (zip.js 2.10.0)
    filenameValidation: "balanced",
  });

  const writeFlags =
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW;

  try {
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      if (entry.symlink) {
        throw new Error(`Unsafe zip entry: symlink detected (${entry.filename})`);
      }

      // zip.js 2.10.0 does not treat '\' as a separator — normalize ourselves
      const normalizedFilename = entry.filename.replace(/\\/g, "/");

      if (path.isAbsolute(normalizedFilename)) {
        throw new Error(`Unsafe zip entry: absolute path (${entry.filename})`);
      }

      const parts = normalizedFilename.split("/");
      if (parts.includes("..")) {
        throw new Error(`Unsafe zip entry: contains ".." (${entry.filename})`);
      }

      const destPath = path.resolve(normalizedOutDir, normalizedFilename);
      if (destPath !== normalizedOutDir && !destPath.startsWith(normalizedOutDir + path.sep)) {
        throw new Error(`Unsafe zip entry: escapes target directory (${entry.filename})`);
      }

      if (entry.directory) {
        await fs.promises.mkdir(destPath, { recursive: true });
        const realDest = await fs.promises.realpath(destPath);
        if (realDest !== realOutDir && !realDest.startsWith(realOutDir + path.sep)) {
          throw new Error(`Unsafe zip entry: directory escapes target (${entry.filename})`);
        }
        continue;
      }

      if (entry.uncompressedSize > MAX_ZIP_ENTRY_BYTES) {
        throw new Error(
          `Unsafe zip entry: uncompressed size ${entry.uncompressedSize} exceeds cap (${entry.filename})`,
        );
      }

      const parentDir = path.dirname(destPath);
      await fs.promises.mkdir(parentDir, { recursive: true });
      const realParent = await fs.promises.realpath(parentDir);
      if (realParent !== realOutDir && !realParent.startsWith(realOutDir + path.sep)) {
        throw new Error(`Unsafe zip entry: parent escapes target (${entry.filename})`);
      }

      const data = await entry.getData(new Uint8ArrayWriter());
      // O_EXCL|O_NOFOLLOW: refuse overwrite and refuse writing through a planted symlink
      const handle = await fs.promises.open(destPath, writeFlags, 0o600);
      try {
        await handle.writeFile(data);
      } finally {
        await handle.close();
      }
    }
  } finally {
    await zipReader.close();
  }
}

function extractArchive(filePath, outDir, callback) {
  const fileName = path.basename(filePath);

  if (path.extname(filePath) === ".zip") {
    (async () => {
      try {
        await extractZipSafe(filePath, outDir);
        callback(true);
      } catch {
        callback(false);
      }
    })();
  } else if (fileName.endsWith(".tar.gz") || path.extname(filePath) === ".tar") {
    try {
      extractTAR.x({
        cwd: outDir,
        file: filePath,
        sync: true,
        preservePaths: true,
      });
      callback(true);
    } catch {
      callback(false);
    }
  } else {
    callback(false);
  }
}

export function downloadLatestDaemon(nodePath, callback) {
  const finalTempDir = path.join(os.tmpdir(), ensureNodeUniqueId());
  const linuxOSInfo = getLinuxOSInfo();

  if (fs.existsSync(finalTempDir)) {
    fs.rmSync(finalTempDir, { recursive: true, force: true });
  }

  // create the temp dir again
  fs.mkdirSync(finalTempDir, { recursive: true });

  // only for linux try to get it
  if (process.platform === "linux") {
    if (linuxOSInfo.id === "ubuntu") {
      if (!supportedUbuntuVersionsCore.includes(linuxOSInfo.version_id)) {
        callback(wrongLinuxOSMsg);
        return false;
      }
    } else {
      callback(wrongLinuxOSMsg);
      return false;
    }
  } else if (process.platform === "darwin") {
    callback(wrongOSMsg);
    return false;
  }

  // Define a function to filter assets.
  const filterAssetNode = (asset) => {
    if (process.platform === "win32") {
      return asset.name.indexOf("win64") >= 0;
    } else if (process.platform === "linux") {
      if (linuxOSInfo.id === "ubuntu" && linuxOSInfo.version_id.startsWith("20")) {
        return asset.name.indexOf("ubuntu-2004") >= 0;
      } else if (linuxOSInfo.id === "ubuntu" && linuxOSInfo.version_id.startsWith("22")) {
        return asset.name.indexOf("ubuntu-2204") >= 0;
      } else if (linuxOSInfo.id === "ubuntu" && linuxOSInfo.version_id.startsWith("24")) {
        return asset.name.indexOf("ubuntu-2404") >= 0;
      } else {
        return false;
      }
    } else if (process.platform === "darwin") {
      return false;
    } else {
      return false;
    }
  };

  downloadRelease("ConcealNetwork", "conceal-core", finalTempDir, filterRelease, filterAssetNode)
    .then(() => {
      fs.readdir(finalTempDir, (_err, items) => {
        if (items.length > 0) {
          extractArchive(path.join(finalTempDir, items[0]), finalTempDir, (success) => {
            if (success) {
              fs.rmSync(path.join(finalTempDir, items[0]), { recursive: true, force: true });

              fs.readdir(finalTempDir, (_err2, items) => {
                if (items.length > 0) {
                  if (process.platform === "win32") {
                    const sourceFile = path.join(finalTempDir, getNodeExecutableName());
                    const targetFile = path.join(path.dirname(nodePath), getNodeExecutableName());
                    fs.cpSync(sourceFile, targetFile);
                  } else {
                    const sourceFile = path.join(finalTempDir, items[0], getNodeExecutableName());
                    const targetFile = path.join(path.dirname(nodePath), getNodeExecutableName());
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
    })
    .catch((err) => {
      callback(err.message);
    });
}

export function downloadLatestGuardian(callback, swapExecutableCallback) {
  // Check if running via Node.js - updates not supported
  if (getGuardianExecutableName() === "node") {
    callback("Guardian update not supported when running via Node.js");
    return;
  }

  const current = currentVersion();

  // latestVersion() returns a Promise, so we need to handle it asynchronously
  latestVersion()
    .then((latest) => {
      if (current === latest) {
        callback(`Already running the latest version (${current})`);
        return;
      } else if (current > latest) {
        callback(`Current version is greater than latest version (${current} > ${latest})`);
        return;
      } else {
        console.log(`Updating from version ${current} to ${latest}`);
        // Continue with the existing download logic below
        executeDownload(`v${latest}`);
      }
    })
    .catch((err) => {
      callback(`Failed to get latest version: ${err.message}`);
      return;
    });

  // Move all download logic into a separate function that only gets called when needed
  function executeDownload(releaseTag) {
    const finalTempDir = path.join(os.tmpdir(), ensureNodeUniqueId());
    const linuxOSInfo = getLinuxOSInfo();
    if (!fs.existsSync(finalTempDir)) {
      fs.mkdirSync(finalTempDir, { recursive: true });
    }

    // remove and remake the dir
    fs.rmSync(finalTempDir, { recursive: true, force: true });
    fs.mkdirSync(finalTempDir, { recursive: true });

    // Define a function to filter assets.
    const filterAssetGuardian = (asset) => {
      if (process.platform === "win32") {
        return asset.name.indexOf("win64") >= 0;
      } else if (process.platform === "linux") {
        if (!supportedUbuntuVersionsGuardian.includes(linuxOSInfo.version_id)) {
          return false;
        } else {
          // Check Ubuntu version and select appropriate asset:
          // - Ubuntu 22.x: use guardian-linux64-ubuntu-22.tar.gz
          // - Ubuntu 24.x: use guardian-linux64-ubuntu-24.tar.gz
          // - Ubuntu 20.x: use guardian-linux64.tar.gz (generic, no Ubuntu specification)
          if (linuxOSInfo.version_id.startsWith("22")) {
            return asset.name.indexOf("ubuntu-22") >= 0;
          } else if (linuxOSInfo.version_id.startsWith("24")) {
            return asset.name.indexOf("ubuntu-24") >= 0;
          } else {
            return asset.name.indexOf("linux64") >= 0 && asset.name.indexOf("ubuntu-") === -1;
          }
        }
      } else if (process.platform === "darwin") {
        return asset.name.indexOf("mac64") >= 0;
      } else {
        return false;
      }
    };

    // Execute the actual download
    downloadRelease(
      "ConcealNetwork",
      "conceal-guardian",
      finalTempDir,
      filterRelease,
      filterAssetGuardian,
    )
      .then(() => {
        fs.readdir(finalTempDir, async (_err, items) => {
          if (items.length > 0) {
            const archivePath = path.join(finalTempDir, items[0]);
            try {
              await verifyArchiveChecksum(
                archivePath,
                "ConcealNetwork",
                "conceal-guardian",
                releaseTag,
              );
            } catch (err) {
              fs.rmSync(finalTempDir, { recursive: true, force: true });
              callback(err.message);
              return;
            }
            extractArchive(archivePath, finalTempDir, (success) => {
              if (success) {
                // 1. Backup current executable
                const executableName = getGuardianExecutableName();
                const extensionPos = executableName.lastIndexOf(".");
                // Use existing extensionPos to handle any extension properly
                let backupName;
                if (extensionPos < 0) {
                  backupName = `${executableName}-${current}.old`;
                } else {
                  backupName =
                    executableName.substring(0, extensionPos) +
                    "-" +
                    current +
                    executableName.substring(extensionPos) +
                    ".old";
                }
                // Copy instead of rename since the file is currently running
                fs.cpSync(
                  path.join(process.cwd(), executableName),
                  path.join(process.cwd(), backupName),
                );

                // 2. Get list of files to preserve from exclude.txt
                let excludeFiles = [];
                const excludePath = path.join(finalTempDir, "exclude.txt");
                if (fs.existsSync(excludePath)) {
                  excludeFiles = fs
                    .readFileSync(excludePath, "utf-8")
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
                }

                // 3. Clean CWD - remove all files except *.old, excluded files, and current executable
                fs.readdirSync(process.cwd()).forEach((file) => {
                  if (
                    !file.endsWith(".old") &&
                    !excludeFiles.includes(file) &&
                    file !== executableName
                  ) {
                    fs.rmSync(path.join(process.cwd(), file), { recursive: true, force: true });
                  }
                });

                // 4. Move new files from temp directory (not copy)
                fs.readdirSync(finalTempDir).forEach((file) => {
                  if (
                    !excludeFiles.includes(file) &&
                    !file.endsWith(".gz") &&
                    !file.endsWith(".zip") &&
                    file !== executableName
                  ) {
                    const srcPath = path.join(finalTempDir, file);
                    const destPath = path.join(process.cwd(), file);
                    if (fs.statSync(srcPath).isDirectory()) {
                      fs.cpSync(srcPath, destPath, { recursive: true, force: true });
                      fs.rmSync(srcPath, { recursive: true, force: true });
                    } else {
                      fs.renameSync(srcPath, destPath);
                    }
                  }
                });

                // 5. Find new executable, rename and prepare for final move, doing this way, in case down the road we change the name of the executable, we don't have to change the code here
                let newExecutableName = null;
                fs.readdirSync(finalTempDir).forEach((file) => {
                  if (
                    file.startsWith("guardian-") &&
                    !file.endsWith(".js") &&
                    !file.endsWith(".json") &&
                    !file.endsWith(".gz") &&
                    !file.endsWith(".zip")
                  ) {
                    newExecutableName = file;
                  }
                });

                if (newExecutableName) {
                  // Rename new executable to .new extension
                  const tempNewExecutable = `${executableName}.new`;
                  fs.renameSync(
                    path.join(finalTempDir, newExecutableName),
                    path.join(process.cwd(), tempNewExecutable),
                  );
                  // Set executable permissions
                  fs.chmodSync(path.join(process.cwd(), tempNewExecutable), 0o755);
                  // Clean up temp directory
                  fs.rmSync(finalTempDir, { recursive: true, force: true });
                  // Call the swap executable callback
                  if (swapExecutableCallback) {
                    swapExecutableCallback(tempNewExecutable, executableName, callback);
                  } else {
                    callback(null);
                  }
                } else {
                  callback("New executable not found in downloaded files");
                }
              } else {
                callback("Failed to extract the archive");
              }
            });
          } else {
            callback("No downloaded archives found");
          }
        });
      })
      .catch((err) => {
        callback(err.message);
      });
  } // End of executeDownload function
}

// Get current version
export function currentVersion() {
  const pjson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  return pjson.version;
}

// Get latest version from GitHub releases
export function latestVersion() {
  return new Promise((resolve, reject) => {
    // Fetch latest release from GitHub
    fetch("https://api.github.com/repos/ConcealNetwork/conceal-guardian/releases/latest", {
      headers: { "User-Agent": "Conceal Node Guardian" },
    })
      .then((response) => response.json())
      .then((data) => {
        const version = data.tag_name.replace("v", ""); // Remove 'v' prefix
        resolve(version);
      })
      .catch((err) => {
        reject(`Failed to fetch latest version: ${err.message}`);
      });
  });
}
