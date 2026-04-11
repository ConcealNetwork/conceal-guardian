# Accepted risks

This file documents security-related risks that are **known and accepted** for now.  
Each entry must explain *why* the risk is accepted and *when* it should be revisited.

Use IDs of the form `AR-XXX` so they can be referenced from `findings-reviewed.json`.

> **Current status:** No accepted risks have been recorded yet.
> The sections below are templates for future entries.
---

## AR-001 — Dependabot daily schedule bypasses `min-release-age=7` quarantine

**Status:** accepted  
**Date:** 2026-04-10  
**Related findings:** none  
**Scope:** `.github/dependabot.yml`, `.npmrc`, `.github/workflows/npm-audit.yml`

**Why accepted:**  
`min-release-age=7` in `.npmrc` enforces a quarantine window only when `npm install` is run directly. Dependabot generates PRs by updating `package-lock.json` via the registry, bypassing this guard. CI then runs `npm ci` from the pre-committed lockfile, so the age constraint never fires on Dependabot-sourced updates. No trivial code fix exists; remediation requires either a custom CI age-check step or a schedule change. The risk window is bounded by the mandatory PR review gate.

**Current mitigations:**  
- All Dependabot PRs require human review before merge; reviewers can verify publication dates for high-sensitivity packages (axios, express, execa, nodemailer, download-github-release).
- Socket Security firewall (`sfw`) wraps `npm ci` and `npm audit` in CI, providing behavioral supply-chain monitoring beyond age-gating.
- `npx package-lock-audit` audits the committed lockfile for known vulnerabilities on every PR.
- `ignore-scripts=true` limits damage from malicious lifecycle scripts even if a recently published package is admitted.

**Reevaluation trigger:**  
- A high-sensitivity package appears in a Dependabot PR with a npm publication date fewer than 7 days before the PR was opened.
- Any supply-chain incident involving a Dependabot-driven update in the Node.js ecosystem.
- Automated merge or auto-approve is enabled for Dependabot PRs, removing the human review gate.

**Recommended follow-up:**  
- Consider switching Dependabot schedule from `daily` to `weekly` to reduce exposure to brand-new releases.
- Add `download-github-release` to the high-sensitivity packages list in `security/dependency-policy.md`.
- Evaluate a CI step that checks `npm view <pkg> time.modified` for packages changed by Dependabot PRs.

**Notes:**  
This gap is structural to how Dependabot interacts with npm's release-age feature and is not unique to this repo. The compensating controls are substantive, not cosmetic — the Socket Firewall in particular provides behavioral detection that age-based quarantine does not.

## AR-002

**Title:** Example: Public status endpoint with limited information  
**Linked finding IDs:** (add if linked)  
**Status:** accepted temporarily  
**Date accepted:** YYYY-MM-DD  

**Context:**  
Short explanation of what this risk is (e.g., exposure of a read‑only status page on a non‑standard port).

**Reason for acceptance:**  
- Why it is acceptable for now (e.g., only bound to localhost, protected by firewall, or low impact).
- Business or operational constraints that prevent an immediate fix.

**Conditions to revisit:**  
- What would trigger reevaluation (e.g., exposing the service publicly, new threat model, or upcoming refactor).
- Target version, milestone, or date for reevaluation if known.

**Notes:**  
- Any extra discussion, alternative mitigations, or partial controls.

---

## AR-003

(Use this section as a template for additional accepted risks)