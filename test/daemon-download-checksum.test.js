import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { downloadLatestDaemon } from "../units/download.js";
import { ensureNodeUniqueId } from "../units/utils.js";

const RELEASE_TAG = "v6.0.0";
const ASSET_NAME = "conceal-core-linux64-ubuntu-2404.zip";
const ASSET_URL = `https://example.invalid/download/${ASSET_NAME}`;
const DAEMON_CONTENT = "FAKE-CONCEAL-DAEMON-BINARY";

async function makeDaemonZipBytes() {
  const writer = new Uint8ArrayWriter();
  const zipWriter = new ZipWriter(writer);
  await zipWriter.add("conceal-ubuntu-2404/conceal-daemon", new TextReader(DAEMON_CONTENT));
  await zipWriter.close();
  return writer.getData();
}

function checksumLine(zipBytes, name, hashOverride) {
  const hash =
    hashOverride ?? crypto.createHash("sha256").update(zipBytes).digest("hex");
  return `${hash}  ${name}\n`;
}

async function stubFetch(zipBytes, checksumResponse) {
  const seenUrls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const urlText = String(url);
    seenUrls.push(urlText);
    if (urlText.includes("api.github.com/repos/ConcealNetwork/conceal-core/releases")) {
      return new Response(
        JSON.stringify([
          {
            tag_name: RELEASE_TAG,
            prerelease: false,
            assets: [{ name: ASSET_NAME, browser_download_url: ASSET_URL }],
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (urlText === ASSET_URL) {
      return new Response(new Blob([zipBytes]), { status: 200 });
    }
    if (urlText.includes(`releases/download/${RELEASE_TAG}/checksums.sha256`)) {
      return checksumResponse;
    }
    throw new Error(`unexpected fetch in test: ${urlText}`);
  };
  return {
    seenUrls,
    restore() {
      globalThis.fetch = realFetch;
    },
  };
}

function runDownload(launch) {
  return new Promise((resolve) => {
    downloadLatestDaemon(launch, (...args) => resolve(args));
  });
}

function freshLaunchDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guardian-daemon-dest-"));
  return {
    dir,
    launch: { path: path.join(dir, "conceal-daemon"), explicit: true },
  };
}

test("checksum match proceeds to extract and install the daemon", async () => {
  const zipBytes = await makeDaemonZipBytes();
  const checksumText = checksumLine(zipBytes, ASSET_NAME);
  const stub = await stubFetch(
    zipBytes,
    new Response(checksumText, { status: 200 }),
  );
  const { dir, launch } = freshLaunchDir();
  try {
    const [err] = await runDownload(launch);
    assert.equal(err, null);
    assert.ok(stub.seenUrls.some((url) => url.includes("checksums.sha256")));
    assert.equal(fs.readFileSync(launch.path, "utf8"), DAEMON_CONTENT);
  } finally {
    stub.restore();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(path.join(os.tmpdir(), ensureNodeUniqueId()), {
      recursive: true,
      force: true,
    });
  }
});

test("checksum mismatch aborts before extraction and leaves the daemon path untouched", async () => {
  const zipBytes = await makeDaemonZipBytes();
  const checksumText = checksumLine(zipBytes, ASSET_NAME, "0".repeat(64));
  const stub = await stubFetch(
    zipBytes,
    new Response(checksumText, { status: 200 }),
  );
  const { dir, launch } = freshLaunchDir();
  try {
    const [err] = await runDownload(launch);
    assert.match(String(err), /Integrity check FAILED/);
    assert.equal(fs.existsSync(launch.path), false);
    assert.equal(fs.existsSync(path.join(os.tmpdir(), ensureNodeUniqueId())), false);
    assert.deepEqual(
      stub.seenUrls.filter((url) => url.includes("checksums.sha256")).length > 0,
      true,
    );
  } finally {
    stub.restore();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(path.join(os.tmpdir(), ensureNodeUniqueId()), {
      recursive: true,
      force: true,
    });
  }
});

test("missing checksums.sha256 aborts fail-closed", async () => {
  const zipBytes = await makeDaemonZipBytes();
  const stub = await stubFetch(
    zipBytes,
    new Response("not found", { status: 404 }),
  );
  const { dir, launch } = freshLaunchDir();
  try {
    const [err] = await runDownload(launch);
    assert.match(String(err), /No checksums\.sha256 found/);
    assert.equal(fs.existsSync(launch.path), false);
    assert.equal(fs.existsSync(path.join(os.tmpdir(), ensureNodeUniqueId())), false);
  } finally {
    stub.restore();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(path.join(os.tmpdir(), ensureNodeUniqueId()), {
      recursive: true,
      force: true,
    });
  }
});
