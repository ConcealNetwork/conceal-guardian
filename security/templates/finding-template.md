# Finding template

Use this template when turning a reviewed issue into a tracked finding
(e.g., SG-001) in `security/findings-reviewed.private.json` or any other
private findings store. It is intentionally verbose to capture enough
context for future reviews.

---

## Metadata

- **ID:** `SG-XXX`
- **Title:** Short, specific summary (e.g., “No integrity verification of downloaded release binaries”)
- **Status:** `open` | `in-progress` | `fixed` | `accepted-risk` | `false-positive`
- **Severity:** `low` | `medium` | `high` | `critical`
- **Confidence:** `low` | `medium` | `high`
- **Category:** e.g. `supply-chain`, `config`, `authz`, `transport`, `storage`, `process`

---

## Context

- **Repo:** `conceal-guardian`
- **Date discovered:** `YYYY-MM-DD`
- **Discovered by:** name/handle or `AI-assisted + reviewer`
- **Related review step:** reference to `.cursor/plans/security-hardening.md` section or checklist item
- **Related CI / infra:** workflow names, jobs, or scripts if relevant

---

## Technical description

Explain *what is actually wrong* in concrete terms.

- **Affected files / components:**
  - `path/to/file1`
  - `path/to/file2`
- **Relevant code/config:**
  - Brief snippet or description (do not copy huge blocks; link to lines instead)
- **Root cause:**
  - e.g., “Binary downloads are not verified with checksums or signatures”
- **Preconditions:**
  - What must be true for this to matter (e.g., attacker controls registry, releases, or network)?

---

## Exploitability and impact

- **Exploit path (high-level):**
  - Outline how an attacker would practically abuse this, without step-by-step weaponization.
- **Impact:**
  - What can the attacker gain? (RCE, data exfiltration, integrity loss, DoS, supply-chain compromise)
- **Likelihood:**
  - Brief rationale for how likely this is in your environment.

---

## Evidence

- **How it was found:**
  - e.g., “Priority-1 supply-chain review from security-hardening plan”
- **Links / references:**
  - Links to PRs, issues, CI logs, external advisories, or docs
- **Notes:**
  - Any extra observations supporting the finding

---

## Remediation

- **Recommended fix (current plan):**
  - Short, actionable description
- **Potential side effects / risks:**
  - Behavior changes, migration concerns, compatibility risks
- **Alternative mitigations:**
  - If full fix is not possible immediately

---

## Status history

Track how this finding evolves over time.

- **2026-04-10:** `open` — initial discovery during Priority-1 supply-chain review.
- **2026-04-15:** `in-progress` — branch `fix/sg001` created to add integrity verification.
- **2026-04-20:** `fixed` — merged via PR #123; see commit `abcdef1`.
- **2026-04-22:** `verified` — follow-up review confirms mitigation works as intended.

---

## Accepted risk linkage (if any)

If this finding is intentionally accepted rather than fully fixed:

- **Accepted risk ID:** `AR-XXX`
- **Reason for acceptance:** short rationale
- **Compensating controls:** bullets (refer to `security/accepted-risks.private.md`)
- **Reevaluation trigger:** when this decision should be revisited