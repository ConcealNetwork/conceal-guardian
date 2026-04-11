---
name: security-hardening
description: Repo-aware security review and remediation workflow for Node.js services using the repository's security memory, commands, and findings process.
---

# Security Hardening Skill

Use this skill when the task involves:
- reviewing the repository for security issues,
- creating or refining a security hardening plan,
- validating a suspected vulnerability,
- converting a confirmed issue into a tracked finding,
- proposing or implementing a fix for an existing finding,
- re-running review work while avoiding duplicate findings.

This skill is designed to be portable across repositories, while adapting to each repo's local rules, commands, and security folder contents.

## Objectives

1. Review the codebase in a repo-specific way, not with generic security advice.
2. Prioritize practical, high-signal risks first: dependency/supply-chain, exposed services, auth/trust boundaries, secrets/config, command execution, filesystem access, and unsafe network flows.
3. Use the repository's own security memory before creating new findings.
4. Keep fixes minimal, reviewable, and scoped to one issue at a time.
5. Preserve portability: prefer reusable process and evidence over repo-specific assumptions.

## Required repo context

Before acting, inspect and use these if present:
- `.cursor/rules/`
- `.cursor/commands/`
- `.cursor/plans/`
- `security/README.md`
- `security/threat-model.md`
- `security/findings-reviewed.json`
- `security/findings.schema.json`
- `security/accepted-risks.md`
- `security/templates/`
- relevant app files such as package manifests, lockfiles, server entrypoints, API routes, process supervision, webhook/email/notification config, and deployment scripts

If some files are missing, continue with the available context and explicitly note what is absent.

## Operating principles

- Be repo-specific.
- Do not invent findings without code/config evidence.
- Do not duplicate an existing finding unless the new case is materially different.
- Prefer small, isolated changes over broad refactors.
- Treat security findings as human-reviewed records, not auto-truth.
- When uncertain, propose validation steps instead of overstating risk.
- Respect accepted risks already documented by maintainers.

## Priority order

Review in this o
