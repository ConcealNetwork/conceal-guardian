# Changelog

## 0.7.10 - 2026-11-04

- Support the `conceal-daemon` binary name,`conceal-daemon.exe` on Windows (core version >= 6.7.6).
- Keep legacy `conceald` / `conceald.exe` when that file is in the working directory and `conceal-daemon` is absent.
- With an empty `node.path`, also start a packaged `conceal-daemon` from `/usr/bin` or the environment `PATH`.
- Read the daemon log from the Core data directory (`~/.conceal`, `%APPDATA%\conceal`, or `~/Library/Application Support/conceal`) and fall back to the log beside the binary.
