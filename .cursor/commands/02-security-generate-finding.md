# Security generate finding

Use these files as context:

- `security/findings.schema.json`
- `security/findings-reviewed.json`
- `security/accepted-risks.md`
- `security/threat-model.md`
- `.cursor/rules/30-security-reviewer.mdc`
- `.cursor/rules/40-security-triage.mdc`

Your task is to convert one validated security issue into a proposed finding entry.

Instructions:
1. Read the user-provided issue description carefully.
2. Check `security/findings-reviewed.json` for possible duplicates.
3. If the issue already exists, say so and identify the existing `id`.
4. If it is new, generate a proposed finding object matching `security/findings.schema.json`.
5. If it is better treated as an accepted risk, propose an `AR-XXX` id and explain why.

Requirements:
- Be conservative and evidence-based.
- Do not invent file paths, exploit paths, or impact if they are not supported.
- Prefer updating an existing finding over creating a duplicate.
- Use statuses only from the schema: `open`, `fixed`, `accepted-risk`, `duplicate`, `rejected`.

Output format:
- `decision`: new | duplicate | accepted-risk | rejected
- `finding`: JSON object if new or duplicate
- `acceptedRisk`: markdown stub if accepted-risk is recommended
- `reasoning`: short explanation of the classification

Constraints:
- Do not modify files.
- Do not automatically write to `security/findings-reviewed.json`.
- Do not automatically write to `security/accepted-risks.md`.