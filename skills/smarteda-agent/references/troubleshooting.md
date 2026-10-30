# Runtime recovery

- Routing via Playwright disables ordinary HTTP caching. Cache all requested assets where needed, not just a few scripts. Fetch official assets at runtime; never redistribute WASM or proprietary JavaScript.
- Worker responses must preserve cross-origin isolation: Content-Type application/javascript, COEP require-corp, COOP same-origin, CORP cross-origin (same-origin also worked for same-origin worker), and the observed CORS header.
- Runtime initialization Running does not imply the circuit loaded. Explicit native open followed by exact serialization checks is required.
- The observed qtLoader.isFromCache TypeError occurred after simulator-load callback. It was not the main cause of empty circuit import. Fix XML newlines and worker headers first.
- Native EARTH_GB/IDEAl_CURRENT_GB drag paths froze this tested runtime. XML Ground/DcCurrentAlwaysOn import worked.
- handleStrictSetCircuit with raw XML and stale component pointers after canceled drags caused native null-function errors. Recover through a fresh native open and verified serialized data.
- Screenshots may wait for KoiFont-D8fBFwAi.woff2 and time out. Fix/cache official font responses before retrying capture. A capture failure is not proof of a circuit or save failure.
- Toolbar stopped text was inconsistent with advancing simulation time and live probes. Record actual native behavior; don't present loader state as proof of simulation.

## Hidden native canvas after successful initialization

Observed again on 2026-10-25: the native engine serialized the expected circuit and simulation time advanced, but `#viewer-render` had inline `display: none`. Its Qt canvases consequently had zero bounding rectangles. Inspect the host and ancestor rectangles before assuming a failed import or changing the circuit.

Only after verifying engine readiness and the exact loaded model, remove that host's stale inline display property and dispatch a resize event. Fit the circuit with the native zoom callback, then inspect a capture. This is a page layout repair, not circuit validation; do not replace the canvas with an expected diagram or manufacture readings. A visible host alone does not prove a correct rendered circuit.

If document navigation fails while cached scripts load, a private, previously downloaded official HTML document can be used with its matching runtime assets and original isolation headers. Keep vendor assets out of the repository and delivery. Navigating to an identical hash URL may not reload a failed loader; explicitly reload once the asset recovery routes are installed.

## Built-in network recovery (0.7)

The MCP installs static-resource recovery before navigation. Use smarteda_network to inspect bounded retry/cache/failure counters without design URLs or tokens. Only official static GETs and root HTML are retried; API reads and cloud writes are untouched. Never infer save failure from a font/resource error or repeat a timed-out save without inspecting actual cloud state.

Hashed JS/CSS/font resources are cached in session memory with isolation headers. Unversioned WASM, runtime scripts and HTML are not cached, preventing a stale shell/runtime combination. Restart the MCP server to clear cached assets. SMARTEDA_NETWORK_RECOVERY=false skips automatic recovery; explicitly calling smarteda_network installs it. There is no transparent offline runtime or persistent vendor asset distribution.

The real Chrome test uses a local controlled upstream; its success proves recovery behavior, not current vendor availability or full simulation initialization.

## Persistent bundle tools (0.8)

Use smarteda_cache_save to import known-good local downloads or fetch explicit public asset URLs. Each entry has url and optional local path. Include the matching root HTML, hashed JS/CSS chunks, qtloader.js, smartEDA.js, smartEDA.worker.js, smartEDA.wasm and fonts as needed. discover:true follows root HTML src/href links only, not recursive dynamic module imports. Cache writes preserve the old manifest on a batch failure.

Call smarteda_cache_status, smarteda_cache_load, then smarteda_reload. Loading routes does not itself refresh the page. Missing entries use the ordinary network. Disable disk routes with smarteda_cache_load({enabled:false}); restart the server to clear memory cache too. New bundles must match their HTML/runtime versions; the calling AI decides whether to rebuild/reload and checks actual model readiness afterward. Reload can discard unsaved edits.

Resource bodies travel through a token-protected loopback bridge rather than tool output. SMARTEDA_CACHE selects the private cache directory. Cached proprietary bytes must never enter a public repo or distribution. API data and query-string resources are excluded. A minimal offline Chrome fixture has verified HTML isolation and WASM compilation; full cached vendor initialization is not established by that fixture.
