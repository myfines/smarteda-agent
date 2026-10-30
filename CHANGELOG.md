# Changelog

## 0.8.0

- Add persistent private cache for matching official HTML, JS, WASM, worker and font resources.
- Import existing local downloads or fetch explicit public URLs; optionally discover shell links.
- Add cache save/status/load/bypass and explicit reload tools for AI-directed recovery.
- Stream cached bytes through an authenticated loopback bridge instead of MCP/base64 output.
- Verify actual Chrome upstream-blocked HTML/WASM loading and compilation using a minimal fixture.

## 0.7.0

- Recover transient official static GET failures with bounded attempts before navigation.
- Add a bounded private session cache for hashed assets while preserving isolation headers.
- Add smarteda_network diagnostics; never retry cloud writes or API requests.
- Verify recovery with mock failure cases, a real Chrome/local upstream test, and actual MCP startup.
- Current server outage recovery and unversioned runtime offline caching are not established.

## 0.6.0

- Add explicit-pin connectivity inspection and item/property model diffs.
- Add atomic offline block cloning, internal wire translation, external boundary reporting, cascade deletion and observed-pin wiring.
- Allow native reads to include XML for AI tool chaining.
- Verify all three new tools through actual stdio MCP calls; newly cloned native topology is not yet live-import tested.

## 0.5.0

- Add local configuration doctor and explicit Chrome executable support.
- Align MCP client/server version metadata with the package.
- Restrict published package contents and test package installation inputs.
- Document a reproducible onboarding and official evaluation workflow.
- Add a portable Node protocol test matrix; keep live vendor compatibility separate.

## 0.4.0

Protected PT100 analog example, AVR8js firmware verification and native operation skill references.
