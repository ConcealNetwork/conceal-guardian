# Security review plan (conceal-guardian)

**Overview:** A focused, repo-aligned security review sequence covering supply-chain controls, the Express status API (default port 8080), execa-based daemon lifecycle, notification secrets, and remote/pool trust boundaries—grounded in [`security/threat-model.md`](../security/threat-model.md), [`security/dependency-policy.md`](../security/dependency-policy.md), and [`.cursor/rules/`](../rules/). For evidence-based findings and deduplication, follow [`.cursor/rules/30-security-reviewer.mdc`](../rules/30-security-reviewer.mdc) and [`security/findings-reviewed.json`](../security/findings-reviewed.json).

## Alignment with repo rules

- **Planner** ([`.cursor/rules/20-security-planner.mdc`](../rules/20-security-planner.mdc)): Map trust boundaries and entry points; prefer minimal, verifiable follow-ups after review.
- **Reviewer** ([`.cursor/rules/30-security-reviewer.mdc`](../rules/30-security-reviewer.mdc)): Scope reviews to diffs or explicitly listed files; evidence only; structured findings; check [`security/findings-reviewed.json`](../security/findings-reviewed.json) (currently empty).
- **Triage** ([`.cursor/rules/40-security-triage.mdc`](../rules/40-security-triage.mdc)): When recording findings, dedupe and use statuses in [`security/findings.schema.json`](../security/findings.schema.json); link to [`security/accepted-risks.md`](../security/accepted-risks.md) when applicable (templates only today).
- **Node workflow** ([`.cursor/rules/10-nodejs.mdc`](../rules/10-nodejs.mdc)): Treat [`security/dependency-policy.md`](../security/dependency-policy.md) as the admission baseline alongside [`.npmrc`](../.npmrc) (`min-release-age`, `ignore-scripts`).

## Assumptions and unknowns

- **Assumption:** Deployments vary (localhost-only vs. WAN-exposed API); validate against real firewall and bind address expectations.
- **Unknown:** Whether operators rely on docs that suggest opening 8080 to the internet ([`docs/Troubleshooting.md`](../docs/Troubleshooting.md) mentions external curl)—operational exposure may exceed intended trust model.

---

## 1) Dependency supply-chain controls and install workflow

**Files to inspect first**

| File | Why it matters |
|------|----------------|
| [`.npmrc`](../.npmrc) | Baseline: `min-release-age=7`, `ignore-scripts=true` per policy. |
| [`security/dependency-policy.md`](../security/dependency-policy.md) | Admission rules, high-sensitivity packages (axios, express, execa, nodemailer), exception process. |
| [`package.json`](../package.json) / [`package-lock.json`](../package-lock.json) | Direct deps, overrides (`body-parser`, `path-to-regexp`, `yauzl`), reproducibility. |
| [`.github/workflows/npm-audit.yml`](../.github/workflows/npm-audit.yml) | CI: `npm ci`, Socket firewall wrapper, `package-lock-audit`, audit level. |
| [`.github/dependabot.yml`](../.github/dependabot.yml) | Automated bump cadence vs. policy. |
| [`units/download.js`](../units/download.js) | GitHub release download, zip/tar extract (`extract-zip`, `tar` with `preservePaths`), temp dirs under `os.tmpdir()`—binary supply chain and archive risks. |

**Likely security concerns**

- Drift between policy and practice (e.g., casual `npm install`, lifecycle scripts, or bypassing release-age without documentation).
- Transitive vulnerabilities and override maintenance; lockfile integrity in CI.
- Downloaded daemon binaries: HTTPS endpoint trust, release authenticity, archive extraction path traversal or unexpected file placement.

---

## 2) Express exposure (default port 8080)

**Files to inspect first**

| File | Why it matters |
|------|----------------|
| [`units/apiServer.js`](../units/apiServer.js) | `express()`, `express-rate-limit`, `app.listen(config.api.port)` ([`docs/Configuration.md`](../docs/Configuration.md) default **8080**), routes (`/getInfo`, `/getDaemonLog`, `/getGuardianLog`, `/getPeersData`, static HTML). |
| [`units/engine.js`](../units/engine.js) | Conditional `createServer` when `configOpts.api.port` is set (~659–672). |
| [`config.json.sample`](../config.json.sample) | Default API port. |

**Likely security concerns**

- **Trust boundary** ([`security/threat-model.md`](../security/threat-model.md)): untrusted clients → local Express service without authentication.
- Information disclosure: status JSON, tail of `conceald.log` and `debug.log`, peer/geo aggregation; `Access-Control-Allow-Origin: *` on `/getInfo` widens browser-origin abuse if the host is reachable.
- Rate limit (60/min globally) as DoS mitigation—adequacy for untrusted networks.
- SSRF-style patterns: outbound `axios` in `/getPeersData` uses constructed URLs with validated IPs—confirm no request smuggling or parser gaps.

---

## 3) Execa child-process restart logic for `conceald`

**Files to inspect first**

| File | Why it matters |
|------|----------------|
| [`units/engine.js`](../units/engine.js) | `execa` for daemon: `startDaemonProcess`, `exit` handler and restart loop (`maxCloseErrors`, `errorForgetTime`), `restartDaemonProcess` → `stop`, stdin `exit`/`save`, SIGTERM/SIGKILL timeouts (`terminateTimeout`). |
| [`units/utils.js`](../units/utils.js) | `getNodeActualPath` / `configOpts.node.path` → executable path; separate `swapExecutable` uses `execa` with `bash -c` and interpolated paths. |
| [`units/service.js`](../units/service.js) | Service install/start uses fixed `execa` commands (OS integration). |

**Likely security concerns**

- Command injection if executable path or `configOpts.node.args` can be influenced by untrusted config sources.
- Restart storms: tight restart loop until `process.exit`—availability / resource exhaustion.
- `stop()` logging may write sensitive operational details to user-data `debug.log` via `logMessage` in [`units/engine.js`](../units/engine.js).

---

## 4) Discord webhook and e-mail secret handling

**Files to inspect first**

| File | Why it matters |
|------|----------------|
| [`units/notifiers.js`](../units/notifiers.js) | `notifyViaDiscord` (URL allowlist, `axios.post`), `notifyViaEmail` (`nodemailer.createTransport`, credentials from config). |
| [`units/setup.js`](../units/setup.js) | Interactive capture of Discord URL and SMTP password into config object. |
| [`units/engine.js`](../units/engine.js) | `logMessage` → `fs.appendFile` debug log; notifications pull `getNodeInfoData()`. |

**Likely security concerns**

- Secrets at rest in `config.json` (permissions, backups, screen sharing).
- Accidental logging of tokens/passwords in errors or verbose logs.
- Discord URL validation bypass vs. open redirect or unexpected hosts (review strictness of hostname + path checks).
- SMTP TLS: [`units/notifiers.js`](../units/notifiers.js) sets `tls.rejectUnauthorized: false` on the transporter—review MITM risk vs. operator convenience.

---

## 5) Remote node or pool monitoring trust boundaries

**Files to inspect first**

| File | Why it matters |
|------|----------------|
| [`units/engine.js`](../units/engine.js) | Pool notify: `axios.post` to `pool.notify.url` with validation (HTTPS, `.conceal.network/pool/update` suffix); geo/IP `axios.get` to third-party APIs; local `axios.get` to `http://127.0.0.1:${port}/getinfo` for init. |
| [`units/comms.js`](../units/comms.js) | `conceal-api` RPC to `127.0.0.1`—local daemon trust; `errorCallback` drives restarts from RPC health. |
| [`units/apiServer.js`](../units/apiServer.js) | Overlaps with (2): peer list feeding external geo APIs. |

**Likely security concerns**

- **Guardian → pool**: integrity and confidentiality of posted operational data; URL allowlist maintenance if infrastructure changes.
- **Third-party geo services**: privacy of peer IPs; failure/rate-limit behavior.
- **RPC-derived decisions** ([`security/threat-model.md`](../security/threat-model.md)): treating local RPC responses as authoritative—impact if local daemon or port binding is compromised.

---

## Recommended review order

Execute in this order so findings build on shared context and policy:

1. **Context load (short):** [`security/threat-model.md`](../security/threat-model.md), [`security/README.md`](../security/README.md), [`security/dependency-policy.md`](../security/dependency-policy.md), [`security/findings-reviewed.json`](../security/findings-reviewed.json), [`security/accepted-risks.md`](../security/accepted-risks.md).
2. **Priority 1 — Supply chain:** [`.npmrc`](../.npmrc), [`package.json`](../package.json) / lockfile, [`.github/workflows/npm-audit.yml`](../.github/workflows/npm-audit.yml), [`.github/dependabot.yml`](../.github/dependabot.yml), [`units/download.js`](../units/download.js).
3. **Priority 2 — Express / 8080:** [`units/apiServer.js`](../units/apiServer.js) (full file), [`units/engine.js`](../units/engine.js) API wiring.
4. **Priority 3 — Execa / daemon lifecycle:** [`units/engine.js`](../units/engine.js) (`startDaemonProcess`, `stop`, `restartDaemonProcess`), [`units/utils.js`](../units/utils.js) (`getNodeActualPath`, `swapExecutable`), [`units/service.js`](../units/service.js) as needed.
5. **Priority 4 — Notifications / secrets:** [`units/notifiers.js`](../units/notifiers.js), [`units/setup.js`](../units/setup.js), cross-check `logMessage` paths in [`units/engine.js`](../units/engine.js).
6. **Priority 5 — Remote / pool / RPC:** [`units/engine.js`](../units/engine.js) pool + geo blocks, [`units/comms.js`](../units/comms.js).

After coding changes from findings, apply **triage** per [`.cursor/rules/40-security-triage.mdc`](../rules/40-security-triage.mdc).

---

## Plan implementation checklist

| Step | Status |
|------|--------|
| Context: threat model, dependency policy, findings store, accepted risks | Done (2026-04-09) |
| P1: `.npmrc`, `package.json` / lockfile, `npm-audit` workflow, Dependabot, `download.js` | Done |
| P2: `apiServer.js`, engine API gate | Done |
| P3: Engine daemon/exec paths, `utils.js` `swapExecutable`, `service.js` | Done |
| P4: `notifiers.js`, `setup.js`, logging paths | Done |
| P5: Pool/geo in `engine.js`, `comms.js` RPC | Done |

This checklist records that the **review plan** was applied by reading the listed areas; it does not replace filing validated findings in [`security/findings-reviewed.json`](../security/findings-reviewed.json) when issues are confirmed with evidence.
