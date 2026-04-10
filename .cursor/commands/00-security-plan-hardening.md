# Security plan hardening

Use this command in **Plan Mode**.

Use these files as context:

- `.cursor/rules/00-general.mdc`
- `.cursor/rules/10-nodejs.mdc`
- `.cursor/rules/20-security-planner.mdc`
- `.cursor/rules/30-security-reviewer.mdc`
- `.cursor/rules/40-security-triage.mdc`
- `security/README.md`
- `security/threat-model.md`
- `security/dependency-policy.md`
- `security/findings-reviewed.json`
- `security/accepted-risks.md`

Your task is to create a repo-specific security hardening plan.

Goals:
1. Identify the most security-sensitive areas of this repository.
2. Prioritize dependency supply-chain and install workflow controls first.
3. Then prioritize:
   - network exposure and unauthenticated endpoints,
   - process execution / child-process control,
   - secret handling and notification channels,
   - remote service trust boundaries,
   - archive or binary download / extraction risks.
4. Produce a reviewable, repo-specific plan with clear file references and ordered priorities.

Plan requirements:
- Include an overview section.
- Include assumptions and unknowns.
- Include a priority-ordered review sequence.
- For each priority area, list:
  - files to inspect first,
  - why they matter,
  - likely security concerns.
- Include a short implementation checklist at the end.
- Keep the plan specific to this repository; avoid generic security advice.

Constraints:
- Do not change code.
- Do not modify configuration.
- Do not write findings yet.
- Do not invent issues; this is planning only.
- If important repo details are missing, ask clarifying questions before finalizing the plan.

When the plan is complete:
- save it to `.cursor/plans/security-hardening.md`
- then stop and wait for review