import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseCircuit,
  patchCircuit,
  assertTarget,
  buildReadCode,
  buildSimulationCode,
} from "../src/core.mjs";
const xml = await readFile(
  new URL("../skills/smarteda-agent/assets/pt100.circuit", import.meta.url),
  "utf8",
);
test("native model has structured components and complete wires", () => {
  const m = parseCircuit(xml);
  assert.equal(m.components.length, 14);
  assert.equal(m.connectors.length, 13);
});
test("patch preserves topology and escapes XML values", () => {
  const out = patchCircuit(xml, [
    { id: "Resistor-1", properties: { Resistance: "5 Ω", label: "R & test" } },
  ]);
  assert.equal(parseCircuit(out).connectors.length, 13);
  assert.match(out, /&amp;/);
  assert.match(out, />\n/);
});
test("reject invalid targets and ambiguous modification", () => {
  assert.throws(() =>
    assertTarget("https://evil.example/#/simulator?file_id=x"),
  );
  assert.throws(() =>
    patchCircuit(xml, [{ id: "absent", properties: { Temp: "2" } }]),
  );
  assert.throws(() =>
    patchCircuit(xml, [{ id: "RTD-5", properties: { CircId: "new" } }]),
  );
});
test("wire validation catches missing pin component", () =>
  assert.throws(() =>
    parseCircuit(xml.replace("Resistor-1-lPin", "missing-lPin")),
  ));
test("read and simulation code are selector-free", () => {
  assert.match(buildReadCode(), /getSavedCirc/);
  assert.match(buildSimulationCode("start"), /setSimTime/);
  assert.doesNotMatch(buildReadCode(), /screenshot|click/);
});
