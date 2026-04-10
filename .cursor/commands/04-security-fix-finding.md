# Security fix finding

Use these files as context:

- `.cursor/plans/security-hardening.md`
- `.cursor/rules/00-general.mdc`
- `.cursor/rules/10-nodejs.mdc`
- `.cursor/rules/30-security-reviewer.mdc`
- `security/threat-model.md`
- `security/findings-reviewed.json`
- `security/accepted-risks.md`

Your task is to implement a minimal fix for one approved security finding.

Instructions:
1. Read the user-provided finding ID (for example `SG-001`) and locate it in `security/findings-reviewed.json`.
2. Confirm the finding is in status `open` unless the user explicitly says otherwise.
3. Propose the smallest safe fix that addresses the root cause without broad refactoring.
4. Before changing code, explain:
   - the file(s) to change,
   - the minimal patch strategy,
   - possible behavioral side effects.
5. Apply only the minimal code/config/doc changes needed.
6. After changes, summarize:
   - what changed,
   - why it addresses the finding,
   - what should be manually tested.

Constraints:
- Do not introduce new dependencies unless explicitly approved.
- Do not fix unrelated issues in the same pass.
- Do not modify multiple findings at once unless explicitly asked.
- Do not change `security/findings-reviewed.json` automatically unless explicitly asked.
- Stop after implementing the fix and summarizing the diff.