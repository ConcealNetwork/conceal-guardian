# Dependency policy

## Purpose

This repository must not accept dependency updates blindly.

The goal of this policy is to reduce npm supply-chain risk by:
- delaying adoption of very recent package releases,
- disabling install-time lifecycle scripts by default,
- using deterministic installs from lockfile,
- requiring explicit review for intentional dependency changes.

## Baseline enforcement

This repository uses project-level npm defaults in `.npmrc`:

```ini
min-release-age=7
ignore-scripts=true
```

These settings are the baseline guardrails for all contributors and CI using npm with this repository.

## Default install workflow

For normal installs in an existing repository state:

```bash
npm ci
```

Rules:
- Use `npm ci` for normal installs from a committed lockfile.
- Do not use `npm install` casually on an existing project.
- Keep `package-lock.json` committed and review lockfile changes carefully.

## Intentional dependency changes

When adding, removing, or upgrading dependencies:

1. Make the dependency change intentionally.
2. Review the package or version first with `npx npq` when appropriate.
3. Respect `.npmrc` protections, including `min-release-age` and `ignore-scripts=true`.
4. If the package requires lifecycle scripts, stop and explicitly review why.
5. Commit dependency changes separately from unrelated code changes when possible.

Examples:

```bash
npx npq npm install axios@1.13.2
npx npq npm install express@latest
```

## Risk rules

Treat these conditions as higher risk and require explicit approval:
- very recent package releases,
- packages that require install or postinstall scripts,
- unusual or unexpected dependency tree changes,
- missing or suspicious trust signals,
- packages added outside the normal review flow.

## High-sensitivity packages

Exercise extra caution with packages that have broad runtime impact or infrastructure access, including:
- axios
- express
- execa
- nodemailer
- Discord webhook or bot-related packages

## Exception process

Exceptions are allowed, but they must be explicit.

Examples:
- temporarily bypassing `ignore-scripts=true` for a known package that genuinely requires build/install scripts,
- intentionally accepting a newer package version than the release-age threshold,
- urgent response to a critical security fix.

When making an exception:
- document why,
- keep the change narrow,
- review the resulting diff carefully,
- return to the default policy afterward.

## Notes

- `npx npq` is preferred for one-off dependency review when `npq` is not installed globally.
- `npx` may fetch the tool if it is not already available locally or in cache, so use it deliberately.
- This policy is designed to be portable to other Node.js repositories with minimal changes.