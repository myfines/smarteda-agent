# Runtime recovery

- Routing via Playwright disables ordinary HTTP caching. Cache all requested assets where needed, not just a few scripts. Fetch official assets at runtime; never redistribute WASM or proprietary JavaScript.
- Worker responses must preserve cross-origin isolation: Content-Type application/javascript, COEP require-corp, COOP same-origin, CORP cross-origin (same-origin also worked for same-origin worker), and the observed CORS header.
- Runtime initialization Running does not imply the circuit loaded. Explicit native open followed by exact serialization checks is required.
- The observed qtLoader.isFromCache TypeError occurred after simulator-load callback. It was not the main cause of empty circuit import. Fix XML newlines and worker headers first.
- Native EARTH_GB/IDEAl_CURRENT_GB drag paths froze this tested runtime. XML Ground/DcCurrentAlwaysOn import worked.
- handleStrictSetCircuit with raw XML and stale component pointers after canceled drags caused native null-function errors. Recover through a fresh native open and verified serialized data.
- Screenshots may wait for KoiFont-D8fBFwAi.woff2 and time out. Fix/cache official font responses before retrying capture. A capture failure is not proof of a circuit or save failure.
- Toolbar stopped text was inconsistent with advancing simulation time and live probes. Record actual native behavior; don't present loader state as proof of simulation.
