import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  translateCircuit,
  buildScopeCode,
  buildLayoutCode,
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
    { id: "Resistor-1", properties: { Resistance: "5 惟", label: "R & test" } },
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

test("translate updates every wire point and preserves topology", () => {
  const out = translateCircuit(xml, -800, -60);
  const m = parseCircuit(out);
  assert.equal(m.connectors.length, 13);
  assert.equal(
    m.components.find((x) => x.CircId === "DcCurrentAlwaysOn-6").Pos,
    "-1000,-60",
  );
  assert.equal(m.connectors[0].pointList, "-1000,-80,-1000,-160");
});
test("layout code accepts bounded custom paper sizes only", () => {
  assert.match(buildLayoutCode(700, 350), /passSetting/);
  assert.throws(() => buildLayoutCode(-1, 350));
  assert.throws(() => buildLayoutCode(700, Infinity));
});

test("scope capture uses real native callback, restores it, and rejects injected IDs", () => {
  const code = buildScopeCode("Oscope-90", 3);
  assert.match(code, /sendDataToUI/);
  assert.match(code, /finally/);
  assert.match(code, /handleOscopeDisplayData/);
  assert.throws(() => buildScopeCode("bad id", 3));
  assert.throws(() => buildScopeCode("Oscope-90", 1001));
});

test("known identical native Trigger duplication is normalized, conflicting values fail", () => {
  assert.equal(
    parseCircuit(
      '<circuit><item itemtype="Oscope" CircId="Oscope-1" Trigger="0" Trigger="0" /></circuit>',
    ).components.length,
    1,
  );
  assert.throws(() =>
    parseCircuit(
      '<circuit><item itemtype="Oscope" CircId="Oscope-1" Trigger="0" Trigger="1" /></circuit>',
    ),
  );
});
