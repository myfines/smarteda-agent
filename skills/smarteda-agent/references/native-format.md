# Tested native circuit format

Separate every XML element with newlines. Compact one-line XML silently loaded an empty circuit; the multiline equivalent worked.

- DC source: `DcCurrentAlwaysOn`, `Current="1 mA"`; pins `<id>-out-pin` and `<id>-negative-pin`, local coordinates (0,-20)/(0,20).
- Resistor and RTD endpoints: `<id>-lPin`, `<id>-rPin`, local x ±16.
- Ground: `Ground`, `<id>-Gnd`, local (0,-16).
- Junction: `Node`, pins `<id>-0`, `<id>-1`, `<id>-2`.
- Voltage display: `MvProbe`, `<id>-inpin`, `ShowVolt="true" Threshold="0 V"`.
- Wires: `Connector`, `startpinid`, `endpinid`, comma-separated `pointList`; input `CircId` is serialized as `uid`.

See assets/pt100.circuit for a complete verified model. Component IDs are local circuit identifiers, not cloud account IDs.

PT100 compensation is `(2*VB-VA)/I`. Cancellation requires matched carrying leads RL1/RL3; arbitrary unequal leads do not cancel. The example contains 14 components and 13 connectors. RTD follows R0*(1+A*T+B*T*T) for T>=0, A=0.0039083, B=-0.0000005775.
