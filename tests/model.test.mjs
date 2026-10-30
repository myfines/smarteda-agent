import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectCircuit, diffCircuits, editCircuit } from "../src/model.mjs";
import { parseCircuit } from "../src/core.mjs";
const xml = await readFile(
  new URL("../skills/smarteda-agent/assets/pt100.circuit", import.meta.url),
  "utf8",
);
test("nets merge shared pins but do not infer crossing wires", () => {
  const x =
    '<circuit><item itemtype="Resistor" CircId="Resistor-1"/><item itemtype="Resistor" CircId="Resistor-2"/><item itemtype="Connector" uid="w1" startpinid="Resistor-1-a" endpinid="Resistor-2-a" pointList="0,0,20,0"/><item itemtype="Connector" uid="w2" startpinid="Resistor-2-a" endpinid="Resistor-2-b" pointList="20,0,20,20"/></circuit>';
  const r = inspectCircuit(x);
  assert.equal(r.nets.length, 1);
  assert.equal(r.nets[0].pins.length, 3);
  assert.equal(r.electricalRulesChecked, false);
});
test("clone block keeps internal wires and reports external boundaries", () => {
  const before = parseCircuit(xml);
  const wire = before.connectors[0];
  const ids = [wire.startpinid, wire.endpinid].map(
    (pin) =>
      before.components.find((c) => pin.startsWith(c.CircId + "-")).CircId,
  );
  const r = editCircuit(xml, {
    clone: { ids: [...new Set(ids)], dx: 300, dy: 200 },
  });
  const after = parseCircuit(r.xml);
  assert.equal(
    after.components.length,
    before.components.length + new Set(ids).size,
  );
  assert.ok(after.connectors.length > before.connectors.length);
  for (const [old, id] of Object.entries(r.idMap)) assert.notEqual(old, id);
  const diff = diffCircuits(xml, r.xml);
  assert.equal(diff.removed.length, 0);
  assert.equal(
    diff.added.length,
    after.components.length +
      after.connectors.length -
      before.components.length -
      before.connectors.length,
  );
});
test("remove rejects connected components unless cascade is explicit", () => {
  const pin = parseCircuit(xml).connectors[0].startpinid;
  const id = parseCircuit(xml).components.find((c) =>
    pin.startsWith(c.CircId + "-"),
  ).CircId;
  assert.throws(() => editCircuit(xml, { remove: [id] }), /connected/i);
  const r = editCircuit(xml, { remove: [id], cascade: true });
  assert.ok(!parseCircuit(r.xml).components.some((c) => c.CircId === id));
});
test("invalid edits fail atomically and original remains valid", () => {
  assert.throws(
    () => editCircuit(xml, { clone: { ids: ["missing"], dx: 0, dy: 0 } }),
    /Unknown/,
  );
  assert.throws(
    () =>
      editCircuit(xml, {
        connections: [
          {
            from: "Resistor-1-FAKE",
            to: "Resistor-2-FAKE",
            points: [0, 0, 10, 10],
          },
        ],
      }),
    /pin/i,
  );
  assert.equal(diffCircuits(xml, xml).changed.length, 0);
  assert.equal(diffCircuits(xml, xml).topologyChanged, false);
});

test("cloned boundary pins can be wired back; duplicate and malformed routes fail", () => {
  const block = editCircuit(xml, {
    clone: { ids: ["Resistor-1"], dx: 200, dy: 0 },
  });
  assert.ok(block.boundaries.length > 0);
  const b = block.boundaries[0];
  // Use one atomic edit so cloned boundary pin provenance is retained.
  const options = {
    clone: { ids: ["Resistor-1"], dx: 200, dy: 0 },
    connections: [{ from: b.newPin, to: b.externalPin, points: [0, 0, 20, 0] }],
  };
  const result = editCircuit(xml, options);
  assert.equal(
    parseCircuit(result.xml).connectors.length,
    parseCircuit(xml).connectors.length + 1,
  );
  assert.throws(
    () =>
      editCircuit(xml, {
        ...options,
        connections: [...options.connections, ...options.connections],
      }),
    /Duplicate/,
  );
  assert.throws(
    () =>
      editCircuit(xml, {
        ...options,
        connections: [{ ...options.connections[0], points: [0, 0, 2, 3, 4] }],
      }),
    /points/,
  );
});
test("property-only diff is separate from topology and wire geometry", () => {
  const modified = xml.replace('Resistance="2 Ω"', 'Resistance="3 Ω"');
  const d = diffCircuits(xml, modified);
  assert.equal(d.changed.length, 1);
  assert.equal(d.topologyChanged, false);
});
