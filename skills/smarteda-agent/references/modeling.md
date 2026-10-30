# AI model operations

Use `smarteda_read` with `includeXml:true` to obtain the native XML once. Pass that XML directly to offline tools. Avoid repeatedly reading a full live design when working offline.

1. Call `smarteda_inspect({xml})` for explicit pin nets, type counts and unwired component IDs. Unwired decorative components are not automatically errors. A net joins only explicitly shared pin IDs: wire crossings, common ground symbols and named-net equivalence are not inferred.
2. For a flat reusable block, call:

```json
{"xml":"<native XML>","clone":{"ids":["Resistor-1","Resistor-2"],"dx":300,"dy":200}}
```

`smarteda_edit` returns new IDs, transformed XML, internal wires and `boundaries`. Boundary entries identify cloned pins that need reconnection; no external wiring is silently copied. Labels/designators receive a suffix to distinguish copies. Clone uses native items as templates; component libraries, hierarchical subcircuits and arbitrary hidden reference rewriting are not established.

3. To reconnect in the same atomic edit, supply `connections:[{from:"<newPin>",to:"<observed existing pin>",points:[0,0,20,0]}]`. Coordinates are explicit native wire-route points; they are not inferred physical terminal positions. Pins must already occur in the original model or be mapped from an observed template pin. An unobserved but physically valid pin still fails; do not guess it.
4. Remove a connected component with `remove:["Resistor-1"],cascade:true` to explicitly remove its incident wires. Default cascade=false rejects dangling edits; connectors can also be removed by ID. Unknown IDs, duplicate endpoints and malformed coordinates fail before a new XML is returned.
5. Use `smarteda_diff` to separate parameter changes from additions/removals and connection changes. Pure layout/route-coordinate changes do not set topologyChanged. Then run `smarteda_validate` and inspect the edited model.
6. Apply only to the intended sandbox using the existing `smarteda_apply` expectedFileId/backup/native-reload verification flow, then simulate and export. Offline model validity does not prove native import, correct physical pins, electrical behavior or live waveform freshness. Never report an offline edit as a completed native simulation.

These operations need no visual model, OCR or screenshot coordinates. Electrical correctness still needs actual simulator measurements and appropriate engineering checks.
