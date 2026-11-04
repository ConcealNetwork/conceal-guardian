import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { extractZipSafe } from "../units/download.js";
import {
  daemonExtractSearchDirs,
  daemonInstallDestination,
  daemonLogBasename,
  daemonLogCandidates,
  resolveDaemonLogPath,
  defaultDaemonSearchDirs,
  describeNodeLaunch,
  findRealDaemonBinary,
  installDaemonFile,
  resolveDefaultDaemonPath,
} from "../units/utils.js";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "guardian-daemon-"));
}

function writeFile(dir, name, contents) {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test("default resolution prefers a regular conceal-daemon over a leftover conceald", () => {
  const dir = tempDir();
  writeFile(dir, "conceald", "stale");
  writeFile(dir, "conceal-daemon", "current");
  writeFile(dir, "conceal-daemon.partial", "partial");
  writeFile(dir, "conceal-daemon.previous", "previous");

  assert.equal(path.basename(resolveDefaultDaemonPath(dir)), "conceal-daemon");
  assert.equal(fs.readFileSync(resolveDefaultDaemonPath(dir), "utf8"), "current");
});

test("default resolution falls back to conceald only when conceal-daemon is absent", () => {
  const dir = tempDir();
  writeFile(dir, "conceald", "legacy");
  fs.symlinkSync(path.join(dir, "conceald"), path.join(dir, "conceal-daemon"));

  assert.equal(path.basename(resolveDefaultDaemonPath(dir)), "conceald");
});

test("default resolution names conceal-daemon when the directory is empty", () => {
  const dir = tempDir();
  assert.equal(path.basename(resolveDefaultDaemonPath(dir)), "conceal-daemon");
  assert.equal(fs.existsSync(resolveDefaultDaemonPath(dir)), false);
});

test("windows names follow the same precedence", () => {
  const dir = tempDir();
  writeFile(dir, "conceald.exe", "stale");
  writeFile(dir, "conceal-daemon.exe", "current");
  const options = { platform: "win32" };

  assert.equal(
    path.basename(resolveDefaultDaemonPath(dir, options)),
    "conceal-daemon.exe",
  );
  fs.rmSync(path.join(dir, "conceal-daemon.exe"));
  assert.equal(path.basename(resolveDefaultDaemonPath(dir, options)), "conceald.exe");
});

test("explicit node.path and --daemon are returned unchanged", () => {
  const dir = tempDir();
  writeFile(dir, "conceal-daemon", "current");
  const missing = path.join(dir, "missing-conceald");
  const configured = path.join(dir, "conceald");
  writeFile(dir, "conceald", "configured");

  assert.equal(
    describeNodeLaunch({}, { node: { path: missing } }, dir).path,
    missing,
  );
  assert.equal(describeNodeLaunch({}, { node: { path: missing } }, dir).explicit, true);
  assert.equal(
    describeNodeLaunch({ daemon: path.join(dir, "conceal-daemon") }, { node: { path: configured } }, dir)
      .path,
    configured,
  );
  assert.equal(
    describeNodeLaunch({ daemon: configured }, { node: { path: "" } }, dir).path,
    configured,
  );
  assert.equal(describeNodeLaunch({ daemon: configured }, { node: {} }, dir).explicit, true);
});

test("empty node.path uses conceal-daemon, then conceald", () => {
  const dir = tempDir();
  const localOnly = { searchDirs: [dir] };
  writeFile(dir, "conceald", "legacy");
  assert.equal(
    path.basename(describeNodeLaunch({}, { node: { path: "" } }, dir, localOnly).path),
    "conceald",
  );
  writeFile(dir, "conceal-daemon", "current");
  assert.equal(
    path.basename(describeNodeLaunch({}, { node: {} }, dir, localOnly).path),
    "conceal-daemon",
  );
});

test("linux search order is the working directory, /usr/bin, then PATH", () => {
  const dir = tempDir();
  const dirs = defaultDaemonSearchDirs(dir, {
    platform: "linux",
    pathEnv: ["/opt/bin", "/usr/bin"].join(path.delimiter),
  });
  assert.deepEqual(dirs, [path.resolve(dir), path.resolve("/usr/bin"), path.resolve("/opt/bin")]);
  assert.deepEqual(defaultDaemonSearchDirs(dir, { platform: "win32", pathEnv: "/usr/bin" }), [
    path.resolve(dir),
  ]);
});

test("package lookup uses conceal-daemon only and does not install over it", () => {
  const workDir = tempDir();
  const usrBin = tempDir();
  const pathDir = tempDir();
  writeFile(usrBin, "conceald", "not-packaged");
  writeFile(pathDir, "conceald", "not-packaged");
  writeFile(pathDir, "conceal-daemon", "from-path");
  const searchDirs = [workDir, usrBin, pathDir];

  const packaged = describeNodeLaunch({}, { node: {} }, workDir, { searchDirs });
  assert.equal(packaged.path, path.join(pathDir, "conceal-daemon"));
  assert.equal(packaged.explicit, false);
  assert.equal(packaged.installDir, workDir);
  assert.equal(
    daemonInstallDestination(packaged, path.join(pathDir, "conceal-daemon")),
    path.join(workDir, "conceal-daemon"),
  );

  fs.rmSync(path.join(pathDir, "conceal-daemon"));
  const missing = describeNodeLaunch({}, { node: {} }, workDir, { searchDirs });
  assert.equal(missing.path, path.join(workDir, "conceal-daemon"));
  assert.equal(missing.installDir, undefined);
  assert.equal(fs.existsSync(missing.path), false);
});

test("a local conceald is kept and conceald outside that directory is ignored", () => {
  const workDir = tempDir();
  const usrBin = tempDir();
  writeFile(workDir, "conceald", "local");
  writeFile(usrBin, "conceal-daemon", "packaged");
  const launch = describeNodeLaunch({}, { node: {} }, workDir, {
    searchDirs: [workDir, usrBin],
  });
  assert.equal(launch.path, path.join(workDir, "conceald"));
  assert.equal(launch.installDir, undefined);
});

test("extract search prefers the real new name on linux and windows layouts", () => {
  const root = tempDir();
  writeFile(path.join(root, "ccx-cli"), "conceal-daemon", "new");
  writeFile(root, "conceald", "stale-root");
  const linuxSource = findRealDaemonBinary(daemonExtractSearchDirs(root, { platform: "linux" }), {
    platform: "linux",
  });
  assert.equal(fs.readFileSync(linuxSource, "utf8"), "new");

  const winRoot = tempDir();
  writeFile(winRoot, "conceal-daemon.exe", "new-exe");
  writeFile(path.join(winRoot, "nested"), "conceald.exe", "old-exe");
  const winSource = findRealDaemonBinary(
    daemonExtractSearchDirs(winRoot, { platform: "win32" }),
    { platform: "win32" },
  );
  assert.equal(fs.readFileSync(winSource, "utf8"), "new-exe");
});

test("extract search accepts a legacy-only archive and ignores symlink aliases", () => {
  const root = tempDir();
  const nested = path.join(root, "ccx-cli");
  writeFile(nested, "conceald", "old");
  fs.symlinkSync(path.join(nested, "conceald"), path.join(nested, "conceal-daemon"));

  const source = findRealDaemonBinary(daemonExtractSearchDirs(root), { platform: "linux" });
  assert.equal(path.basename(source), "conceald");
  assert.equal(fs.readFileSync(source, "utf8"), "old");
});

test("an old archive installs conceald when conceal-daemon is not in the archive", () => {
  const nodeDir = tempDir();
  const extractDir = tempDir();
  writeFile(path.join(extractDir, "ccx-cli"), "conceald", "old-release");

  const launch = describeNodeLaunch({}, { node: {} }, nodeDir, { searchDirs: [nodeDir] });
  assert.equal(path.basename(launch.path), "conceal-daemon");
  const source = findRealDaemonBinary(daemonExtractSearchDirs(extractDir));
  installDaemonFile(source, daemonInstallDestination(launch, source));

  assert.equal(fs.existsSync(path.join(nodeDir, "conceal-daemon")), false);
  assert.equal(fs.readFileSync(resolveDefaultDaemonPath(nodeDir), "utf8"), "old-release");
});

test("install copies the new name beside a stale conceald and does not select the stale file", () => {
  const nodeDir = tempDir();
  const extractDir = tempDir();
  writeFile(nodeDir, "conceald", "stale");
  writeFile(path.join(extractDir, "ccx-cli"), "conceal-daemon", "fresh");

  const launch = describeNodeLaunch({}, { node: {} }, nodeDir, { searchDirs: [nodeDir] });
  const source = findRealDaemonBinary(daemonExtractSearchDirs(extractDir));
  installDaemonFile(source, daemonInstallDestination(launch, source));

  assert.equal(fs.readFileSync(path.join(nodeDir, "conceald"), "utf8"), "stale");
  assert.equal(fs.readFileSync(resolveDefaultDaemonPath(nodeDir), "utf8"), "fresh");
  assert.equal(fs.existsSync(path.join(nodeDir, "conceal-daemon.partial")), false);
  assert.equal(fs.existsSync(path.join(nodeDir, "conceal-daemon.previous")), false);
});

test("a second install replaces conceal-daemon and still ignores conceald", () => {
  const nodeDir = tempDir();
  writeFile(nodeDir, "conceald", "stale");
  writeFile(nodeDir, "conceal-daemon", "first");
  const extractDir = tempDir();
  writeFile(extractDir, "conceal-daemon", "second");

  const launch = describeNodeLaunch({}, { node: {} }, nodeDir, { searchDirs: [nodeDir] });
  const source = findRealDaemonBinary([extractDir]);
  installDaemonFile(source, daemonInstallDestination(launch, source));

  assert.equal(fs.readFileSync(path.join(nodeDir, "conceal-daemon"), "utf8"), "second");
  assert.equal(fs.readFileSync(path.join(nodeDir, "conceald"), "utf8"), "stale");
  assert.equal(path.basename(resolveDefaultDaemonPath(nodeDir)), "conceal-daemon");
});

test("explicit node.path is overwritten in place and is not swapped for the other name", () => {
  const nodeDir = tempDir();
  const configured = writeFile(nodeDir, "conceald", "old-configured");
  writeFile(nodeDir, "conceal-daemon", "neighbor");
  const extractDir = tempDir();
  writeFile(extractDir, "conceal-daemon", "from-archive");

  const launch = describeNodeLaunch({}, { node: { path: configured } }, nodeDir);
  const source = findRealDaemonBinary([extractDir]);
  const dest = daemonInstallDestination(launch, source);
  assert.equal(dest, configured);
  installDaemonFile(source, dest);

  assert.equal(describeNodeLaunch({}, { node: { path: configured } }, nodeDir).path, configured);
  assert.equal(fs.readFileSync(configured, "utf8"), "from-archive");
  assert.equal(fs.readFileSync(path.join(nodeDir, "conceal-daemon"), "utf8"), "neighbor");
});

test("a symlink source does not replace the live daemon", () => {
  const dir = tempDir();
  const live = writeFile(dir, "conceald", "live");
  const target = writeFile(dir, "payload", "payload");
  const link = path.join(dir, "conceal-daemon");
  fs.symlinkSync(target, link);

  assert.throws(() => installDaemonFile(link, live), /not a regular file/);
  assert.equal(fs.readFileSync(live, "utf8"), "live");
});

test("daemon log name follows the launched executable", () => {
  assert.equal(daemonLogBasename("/opt/conceal-daemon"), "conceal-daemon.log");
  assert.equal(daemonLogBasename("/opt/conceald"), "conceald.log");
  assert.equal(daemonLogBasename("conceal-daemon.exe"), "conceal-daemon.log");
  assert.equal(daemonLogBasename("conceald.exe"), "conceald.log");
});

test("daemon log prefers the data directory and falls back beside the binary", () => {
  const dataDir = tempDir();
  const binDir = tempDir();
  const daemon = path.join(binDir, "conceal-daemon");
  writeFile(binDir, "conceal-daemon.log", "legacy");
  const options = { dataDir };

  assert.deepEqual(daemonLogCandidates(daemon, options), [
    path.join(dataDir, "conceal-daemon.log"),
    path.join(binDir, "conceal-daemon.log"),
  ]);
  assert.equal(resolveDaemonLogPath(daemon, options), path.join(binDir, "conceal-daemon.log"));

  writeFile(dataDir, "conceal-daemon.log", "data");
  assert.equal(resolveDaemonLogPath(daemon, options), path.join(dataDir, "conceal-daemon.log"));
});

test("zip extract rejects a symlink entry and copies a real dual-name archive", async () => {
  const root = tempDir();
  const symlinkZip = path.join(root, "symlink.zip");
  const realZip = path.join(root, "real.zip");
  const { spawnSync } = await import("node:child_process");
  const python = spawnSync(
    "python3",
    [
      "-c",
      [
        "import stat, sys, zipfile",
        "link_zip, real_zip = sys.argv[1], sys.argv[2]",
        "with zipfile.ZipFile(link_zip, 'w') as zf:",
        "    info = zipfile.ZipInfo('conceald.exe')",
        "    info.create_system = 3",
        "    info.external_attr = (stat.S_IFLNK | 0o777) << 16",
        "    zf.writestr(info, 'conceal-daemon.exe')",
        "with zipfile.ZipFile(real_zip, 'w') as zf:",
        "    zf.writestr('conceal-daemon.exe', b'new-daemon')",
        "    zf.writestr('conceald.exe', b'old-daemon')",
      ].join("\n"),
      symlinkZip,
      realZip,
    ],
    { encoding: "utf8" },
  );
  assert.equal(python.status, 0, python.stderr);

  const symlinkOut = path.join(root, "symlink-out");
  fs.mkdirSync(symlinkOut);
  await assert.rejects(extractZipSafe(symlinkZip, symlinkOut), /symlink detected/);

  const realOut = path.join(root, "real-out");
  fs.mkdirSync(realOut);
  await extractZipSafe(realZip, realOut);
  const source = findRealDaemonBinary(daemonExtractSearchDirs(realOut, { platform: "win32" }), {
    platform: "win32",
  });
  assert.equal(path.basename(source), "conceal-daemon.exe");
  assert.equal(fs.readFileSync(source, "utf8"), "new-daemon");

  const nodeDir = path.join(root, "node");
  fs.mkdirSync(nodeDir);
  writeFile(nodeDir, "conceald.exe", "stale");
  const launch = describeNodeLaunch({}, { node: {} }, nodeDir, { platform: "win32" });
  installDaemonFile(source, daemonInstallDestination(launch, source));
  assert.equal(
    fs.readFileSync(resolveDefaultDaemonPath(nodeDir, { platform: "win32" }), "utf8"),
    "new-daemon",
  );
  assert.equal(fs.readFileSync(path.join(nodeDir, "conceald.exe"), "utf8"), "stale");
});
