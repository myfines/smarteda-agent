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
