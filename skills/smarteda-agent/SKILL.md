---
name: smarteda-agent
description: Operate SmartEDA Qt/WASM circuits through native model serialization and Playwright MCP. Import, verify, simulate and export circuits without screenshot coordinates.
---

# SmartEDA agent

Use for design.ismarteda.com circuit work. Tested against the October 2026 web application; native exports and frontend module hashes are version-dependent.

1. Use the user's authorized logged-in session. Inspect the current URL and controls before acting. Back up the target file content and setting before replacement. Never hardcode account IDs or credentials.
2. Read [native-format.md](references/native-format.md). Prepare multiline XML using `scripts/circuit.py normalize input.circuit output.circuit`; run `check` with the expected connector count.
3. Prefer the repository’s SmartEDA MCP server (`src/server.mjs`) for structured open/read/validate/patch/apply/simulate/export operations. See the repository README for client configuration. Connected native Oscope buffered waveforms can be read numerically at 0.01V reported resolution. Buffer sample freshness is not verified; do not treat callback arrival as a current probe reading. Telemetry itself is not a voltage measurement. Alternatively use the official Playwright MCP server. `scripts/mcp-call.mjs` can call its tools over stdio with a reusable browser profile. Read tool descriptions using `--list` before choosing tools; a profile must already be logged in or authenticated manually.
4. Use the current application's observed save API, preserving file setting. Reopen through the native engine; require serialized component values and connector counts to match the requested case. Engine Running alone does not prove circuit load or simulation success.
5. Start simulation with the observed native callback. Verify advancing simulation and actual voltage readings; screenshots serve as evidence only. Do not infer readings from expected formulas.
6. Use the official export-project UI for vendor archives. Keep plaintext native XML as a separate editable artifact. Save normal operating parameters after fault testing.

Read [validation.md](references/validation.md) for recorded cases. Read [operations.md](references/operations.md) for tested calls and [troubleshooting.md](references/troubleshooting.md) for cache/worker problems. Do not copy vendor runtime assets into the skill or uploaded repository.

The bundled basic PT100 example is an ideal-current-source analog front end. The repository’s examples/pt100-v2 adds native buffering, compensation, gain/offset, RC filtering and automatic comparator flags. Its verified evidence does not establish a native ADC, firmware execution, practical source compliance or completed competition submission.

The v3 example adds comparator hysteresis and a centered custom sheet. Use `smarteda_translate` for offline whole-model shifts and `smarteda_layout` for paper sizing. The Oscope serializer repeats attributes such as Trigger/connectGnd; normalize identical repeats only, and reject conflicting duplicates. Capture original native XML before normalization.

For paper and native numerical waveform work, read [layout-and-scope.md](references/layout-and-scope.md).


For finite-rail excitation, native case validation, and host-tested conversion software, read [howland-validation.md](references/howland-validation.md). V4 remains an analog front-end model; independent C tests are not native MCU execution.
