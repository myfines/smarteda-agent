# 0.5.0 validation record — 2026-10-30

- Windows / Node 24: 15 Node tests and 6 Python tests passed.
- Actual stdio discovery from the packaged server: version 0.5.0, 10 tools. This smoke reused the existing dependency installation via a local junction; it is not a clean dependency install.
- npm pack test gate passed; allowlist preview contained 73 files before the release guide was added. No profile/cache/vendor runtime paths were found.
- npm lockfile audit: zero known vulnerabilities reported at the time of check.
- Skill validator passed.
- Clean install: registry download stalled; offline attempt failed ENOTCACHED for jose. Not certified by this local run.
- Nine Windows/macOS/Linux × Node20/22/24 jobs are configured; remote success must be checked on GitHub.
- No new live SmartEDA session was tested in this release. Previous native evidence remains documented in skill references.
- No official endorsement, official contact, npm registry publication or native MCU support is claimed.
