# Security review: Priority 1

Use these files as the source of truth:

- `.cursor/plans/security-hardening.md`
- `.cursor/rules/20-security-planner.mdc`
- `.cursor/rules/30-security-reviewer.mdc`
- `.cursor/rules/40-security-triage.mdc`
- `security/threat-model.md`
- `security/dependency-policy.md`
- `security/findings-reviewed.json`
- `security/accepted-risks.md`

For this run, focus only on **Priority 1 — dependency supply-chain controls and install workflow** from the plan.

Scope:
- `.npmrc`
- `security/dependency-policy.md`
- `package.json`
- `package-lock.json`
- `.github/workflows/npm-audit.yml` if present
- `.github/dependabot.yml` if present
- `units/download.js`

Tasks:
1. Identify only **real medium, high, or critical security issues** in this scope.
2. For each valid issue, output a proposed finding object that matches `security/findings.schema.json` as closely as possible.
3. If a concern is better treated as an accepted risk, explicitly say so and propose an `AR-XXX` id and rationale.

Requirements for each finding:
- `id` (suggest `SG-001`, `SG-002`, etc. if not already used)
- `title`
- `status` (`open` for new findings)
- `severity`
- `confidence`
- `files`
- `summary`
- `exploitPath`
- `remediation`
- `notes`

Constraints:
- Do not change any code or config.
- Do not modify `security/findings-reviewed.json`.
- Do not modify `security/accepted-risks.md`.
- Do not invent issues to be helpful.
- If there are no valid findings in this scope, say exactly: `no valid findings for Priority 1`.

At the end, provide:
- a short list of proposed findings,
- a short list of proposed accepted risks, if any,
- and a note on whether the repo appears aligned with `security/dependency-policy.md`.