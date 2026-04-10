# Security workflow for this repo

## Purpose

This directory stores the security review memory, threat model, and workflow artifacts for this repository.  
It is intended to be **human-reviewed, Git-committed state**, not a dump of every raw scan.

## Source of truth

These files are authoritative:

- `threat-model.md` — description of assets, entry points, and trust boundaries.
- `findings-reviewed.json` — current set of reviewed findings and their status.
- `accepted-risks.md` — consciously accepted or deferred risks with rationale.
- `findings.schema.json` — JSON schema describing the structure of findings.
- `templates/` — reusable templates for writing and reviewing findings.

The `raw/`, `reports/`, and `tmp/` subdirectories are for **transient artifacts** that are normally ignored by Git.

## How to use the security workflow

1. **Planning (Plan Mode)**  
   - Run `/security-plan-hardening` in Plan Mode.  
   - Review and edit `.cursor/plans/security-hardening.md`.  
   - When architecture or assumptions change, update `threat-model.md` as needed.

2. **Review**  
   - Run `/security-review-priority-1` to review supply chain and install workflow.  
   - Use `/security-generate-finding` to turn real issues into proposed findings.

3. **Recording**  
   - Manually add approved findings to `security/findings-reviewed.json`.  
   - Add accepted risks to `security/accepted-risks.md` when needed.

4. **Triage and fix**  
   - Use `/security-triage-findings` to classify new vs duplicate vs accepted risks.  
   - Use `/security-fix-finding` to apply minimal fixes for one `SG-00X` at a time.

**Approval and follow-up:** A human reviewer still decides what is merged into `findings-reviewed.json` and `accepted-risks.md`. When code changes address a finding, update its status to `fixed` with a short note and date.

## Commit policy

Commit:

- `README.md`
- `threat-model.md`
- `accepted-risks.md`
- `findings.schema.json`
- `findings-reviewed.json`
- `templates/*`

Normally do **not** commit:

- `raw/*`
- `reports/*` (unless you deliberately want a specific report in history)
- `tmp/*`

This keeps the durable security memory in Git while avoiding noise from every individual scan.

## Status values

`findings-reviewed.json` uses these status values:

- `open` — valid issue, not yet fixed.
- `fixed` — addressed in code; include evidence and date.
- `accepted-risk` — consciously accepted; documented in `accepted-risks.md`.
- `duplicate` — same root cause as an existing finding, linked via `duplicateOf`.
- `rejected` — determined not to be a valid issue (e.g., false positive or out of scope).

See `findings.schema.json` for the precise JSON structure.

## Reusable Cursor commands

Reusable security workflows for this repo live in `.cursor/commands/` (numbered files such as `00-security-plan-hardening.md`).

Suggested commands:
- `/security-plan-hardening` — plan trust boundaries and review scope (Plan Mode)
- `/security-review-priority-1` — review dependency and install workflow only
- `/security-generate-finding` — turn one validated issue into a structured finding proposal
- `/security-triage-findings` — compare proposed findings against reviewed findings and accepted risks
- `/security-fix-finding` — implement a minimal fix for one accepted finding

These commands should use:
- `.cursor/plans/security-hardening.md` for review order and scope
- `security/threat-model.md` for repo-specific trust boundaries
- `security/dependency-policy.md` for supply-chain rules
- `security/findings-reviewed.json` as the canonical findings memory
- `security/accepted-risks.md` for consciously accepted risks

The agent should not update `security/findings-reviewed.json` automatically unless explicitly instructed to do so.