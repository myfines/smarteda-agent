# Paper, translation and native buffered scope data

Verified 2026-10-24. Work on a backed-up user-selected file.

Native custom paper API: `qtLoader.module().passSetting(JSON.stringify({layoutType:'9',layoutWidth:'750',layoutHeight:'550'}))`, followed by `autoSavedCirc()`. Dimensions are mm. Verify file-detail setting and reopen after saving. Existing setting fields must be retained. `handleZoomToFit` fits the circuit, not necessarily the whole paper; additional native zoom-out calls were needed for a full-sheet acceptance view.

An offline translation must update every item's Pos and every pair in Connector pointList. Relative label offsets must remain relative. Layout width alone will not fix an off-center circuit. Keep a margin from the bottom-right title block as well as the frame border.

`sendDataToUI('Oscope-90')` requests native Oscope data through `handleOscopeDisplayData(JSON_string)`. Observed shape: Id='Oscope-90Chan1', ChannelData=[{name:'...',value1:'1.54',value2:'0.00'}]. UI labels voltage in V and the coordinate in ms. This callback reports two values rounded to 0.01V. Coordinate ordering can wrap within a native acquisition buffer.

Important: a newly received callback may contain held/transient or historical buffered samples. In repeated case tests, some tail values disagreed with the current live probe display. Returning a fresh callback does not make its samples current. Preserve buffered=true, sampleFreshnessVerified=false, instantaneousMeasurement=false in the MCP result. Do not use its tail as the current temperature or fault state.

Additional scope channel selection and a second scope did not return verified data; fail clearly for missing callbacks. Do not invent values for absent channels. The released v3 example contains only the verified first scope.

Native Oscope serialization repeats same-valued attributes such as Trigger and connectGnd. Native reopening preserved the graph, but strict XML parsers rejected it. Retain raw readback as evidence; normalize identical repeats only for interoperability. Reject conflicting repeats rather than silently choosing one. The Node and Python helpers implement this narrowly for Oscope items.
