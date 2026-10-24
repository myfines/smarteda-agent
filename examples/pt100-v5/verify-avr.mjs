// Runs compiled AVR instructions, ADC peripheral, GPIO LCD bus and UART.
// This is an independent AVR8js run, not a SmartEDA observation.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createMachine } from "./avr-machine.mjs";
const machine = createMachine(
  readFileSync(new URL("./firmware.hex", import.meta.url), "utf8"),
);
const run = (...args) => machine.run(...args);
const cases = [];
const inputs = JSON.parse(
  readFileSync(new URL("./validated-cases.json", import.meta.url), "utf8"),
);
for (const c of inputs.cases) {
  const state = run(cases.length ? 400 : 650, c.adcV, c.flags);
  assert.equal(state.lcd[1].trim(), c.status, JSON.stringify(state));
  assert(state.uart.includes("STATUS=" + c.status), state.uart);
  if (c.temperatureC !== undefined) {
    const t = Number(state.lcd[0].match(/T=([\d.]+)/)?.[1]);
    assert(Math.abs(t - c.temperatureC) < 0.3, JSON.stringify(state));
  }
  assert(state.heartbeatEdges > 0);
  cases.push({ name: c.name, ...state });
}
const result = {
  provenance:
    "Independent AVR8js 0.21.1 executing avr-gcc compiled firmware.hex; actual GPIO-decoded HD44780 text and USART bytes, not native SmartEDA or live analog cosimulation; ADC values from independent ngspice DC results, fault GPIO inputs are injected test values",
  clockHz: 8000000,
  adcReferenceV: 3.3,
  adcBits: 10,
  cases,
};
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
