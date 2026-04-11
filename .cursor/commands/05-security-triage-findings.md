# Security triage findings

Use these files as the source of truth:

- `security/findings-reviewed.json`
- `security/findings.schema.json`
- `security/accepted-risks.md`
- `.cursor/rules/40-security-triage.mdc`

Your task is to triage newly proposed findings against the reviewed findings store.

Instructions:
1. Compare each proposed finding against `security/findings-reviewed.json`.
2. Decide whether it is:
   - `new`
   - `duplicate`
   - `accepted-risk`
   - `rejected`
   - `existing-open`
   - `existing-fixed`
3. Preserve stable IDs for existing findings.
4. If a finding matches an accepted risk, link it with `acceptedRiskId`.
5. If a finding is a duplicate, set `duplicateOf`.
6. If the finding is genuinely new, propose the next available `SG-XXX` id.

Output for each proposed finding:
- `decision`
- `id`
- `title`
- `status`
- `duplicateOf`
- `acceptedRiskId`
- `reason`
- `recommended next action`

Constraints:
- Do not modify files.
- Do not mark something as fixed without evidence from the current code or diff.
- Do not reopen accepted risks unless code or severity changed.
- Be conservative about duplicates and accepted-risk mapping.