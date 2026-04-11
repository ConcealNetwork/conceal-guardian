Generate a proposed accepted-risk entry for `security/accepted-risks.md` based on a specific reviewed issue, reviewer output, or explicit maintainer decision.

Use these as context if present:
- `security/accepted-risks.md`
- `security/findings-reviewed.json`
- `security/findings.schema.json`
- `security/README.md`
- `.cursor/plans/security-hardening.md`
- relevant review output already produced in this chat

Your job is to determine whether the issue is appropriate to record as an **accepted risk** rather than:
- an open finding to fix now,
- a duplicate of an existing accepted risk,
- or a false positive / non-issue.

Important constraints:
- **Do not modify any files.**
- **Do not append to `security/accepted-risks.md`.**
- Output only a **proposed markdown entry** and a short justification.
- If the issue should *not* be accepted as a risk, say so clearly and explain why.
- If a matching accepted risk already exists, say it appears to be a duplicate and reference it.
- Be conservative: accepted risks require explicit rationale and compensating controls, not convenience.

When generating a proposed accepted-risk entry:
- Use the next appropriate `AR-XXX` identifier if one is not provided.
- Reference any related finding IDs (for example `SG-001`) if applicable.
- State:
  - title,
  - status,
  - date,
  - scope / affected files or systems,
  - why the risk is being accepted for now,
  - existing mitigations / compensating controls,
  - what would trigger reevaluation,
  - recommended follow-up,
  - notes.

Preferred output format:

## AR-XXX — <short title>

**Status:** accepted  
**Date:** <YYYY-MM-DD>  
**Related findings:** <SG-XXX or none>  
**Scope:** <files, workflow, system boundary>

**Why accepted:**  
<brief rationale>

**Current mitigations:**  
- <mitigation 1>
- <mitigation 2>

**Reevaluation trigger:**  
- <condition that should cause review>

**Recommended follow-up:**  
- <future hardening step if any>

**Notes:**  
<extra context>

After the markdown block, include a short section:

Decision:
- Accepted risk is appropriate / not appropriate

Reasoning:
- <2-5 concise bullets>

If the current issue is better handled as a finding instead of an accepted risk, say that explicitly and do not force an AR entry.