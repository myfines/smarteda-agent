import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createMachine } from "../examples/pt100-v5/avr-machine.mjs";

test("compiled AVR firmware drives ADC, GPIO LCD and UART through six scenarios", () => {
  const output = execFileSync(
    process.execPath,
    ["examples/pt100-v5/verify-avr.mjs"],
    {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
      timeout: 15000,
    },
  );
  const result = JSON.parse(output);
  assert.equal(result.cases.length, 6);
  assert.equal(result.cases.at(-1).lcd[1].trim(), "OK");
  assert(result.cases.at(-1).heartbeatEdges > result.cases[0].heartbeatEdges);
});

test("AVR loader rejects corrupt HEX before executing instructions", () => {
  assert.throws(() => createMachine(":00000001FE"), /checksum/);
  assert.throws(() => createMachine("not hex"), /Invalid HEX/);
});
