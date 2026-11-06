import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions } from "../units/download.js";

test("0.7.6 is older than 0.7.7", () => {
  assert.ok(compareVersions("0.7.6", "0.7.7") < 0);
  assert.ok(compareVersions("0.7.7", "0.7.6") > 0);
});

test("0.7.9 is older than 0.7.10", () => {
  assert.ok(compareVersions("0.7.9", "0.7.10") < 0);
  assert.ok(compareVersions("0.7.10", "0.7.9") > 0);
});

test("equal versions compare as equal, including a v prefix", () => {
  assert.equal(compareVersions("0.7.10", "0.7.10"), 0);
  assert.equal(compareVersions("v0.7.10", "0.7.10"), 0);
});

test("a higher minor version is newer than a higher patch on the previous minor", () => {
  assert.ok(compareVersions("0.8.0", "0.7.10") > 0);
});
