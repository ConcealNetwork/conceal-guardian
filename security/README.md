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

## Workflow overview

1. **Plan**  
   A security planner creates or updates a plan (for example in `.cursor/plans/security-hardening.md`) and, when needed, updates `threat-model.md` to reflect new assets, entry points, or trust boundaries.

2. **Review**  
   A security reviewer inspects:
   - the current diff, or
   - specific high‑risk files listed in `threat-model.md`,
   and proposes candidate findings (medium or higher severity, with evidence).

3. **Triage**  
   A triage step compares proposed findings against `findings-reviewed.json` and `accepted-risks.md`:
   - update an existing finding if it’s the same root cause,
   - mark as `duplicate` when it’s the same issue reported again,
   - link to an accepted risk when applicable,
   - propose new findings only when they are genuinely new.

4. **Approval**  
   A human reviewer decides which updates to apply:
   - add or update entries in `findings-reviewed.json`,
   - update `accepted-risks.md` if a new risk is accepted,
   - adjust `threat-model.md` if the architecture or assumptions changed.

5. **Follow‑up**  
   Use open findings as input for future hardening work.  
   When code changes to address a finding, update its status to `fixed` with a short note and date.

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

Reusable security workflows for this repo live in `.cursor/commands/`.

Suggested commands:
- `/security-review-priority-1` — review dependency and install workflow only
- `/security-generate-finding` — turn one validated issue into a structured finding proposal
- `/security-triage-findings` — compare proposed findings against reviewed findings and accepted risks
- `/security-apply-finding-fix` — implement a minimal fix for one accepted finding

These commands should use:
- `.cursor/plans/security-hardening.md` for review order and scope
- `security/threat-model.md` for repo-specific trust boundaries
- `security/dependency-policy.md` for supply-chain rules
- `security/findings-reviewed.json` as the canonical findings memory
- `security/accepted-risks.md` for consciously accepted risks

The agent should not update `security/findings-reviewed.json` automatically unless explicitly instructed to do so.