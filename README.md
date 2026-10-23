# SmartEDA agent

A reusable Codex skill for nonvisual SmartEDA Qt/WASM circuit operation using official Playwright MCP and native serialization. Tested on the October 2026 application; this is a community integration, not an official SmartEDA API or standalone custom MCP server.

## Install

Copy `skills/smarteda-agent` to your Codex skills directory. For an installed copy, run `npm ci` inside that skill directory before using its optional MCP caller. For the optional MCP caller, run `npm ci` at repository root and install Chrome if needed. Supply a dedicated profile with your authorized login. Never commit that profile.

```sh
python skills/smarteda-agent/scripts/circuit.py check skills/smarteda-agent/assets/pt100.circuit --wires 13
python -m unittest discover -s tests
node skills/smarteda-agent/scripts/mcp-call.mjs /absolute/private/profile --list
```

For calls, create a JSON file with `name` (an available MCP tool) and `args`. Read the server's current tools before selecting one. The helper closes its MCP connection after each bounded call; persistent login remains in the caller-selected profile.

## Verified capabilities

Multiline native import, 14-component/13-wire PT100 circuit serialization, ideal 1mA source, mV probes, native power operation, seven temperature/lead/fault cases, cloud save/readback, project rename and official project export. Detailed calls and failure recovery are in the skill references.

Compensation `(2VB-VA)/I` requires matching current-carrying leads. Native ADC/MCU and practical current-source electronics were not implemented. Short and high-resistance cases substitute finite resistors. A successful native export does not establish competition submission.

No credentials, cloud identifiers, browser profiles or vendor runtime files are included. Module names and native callbacks can change with platform releases. Fetch vendor assets only from the authorized official site when needed. Playwright MCP and MCP SDK remain their respective upstream projects: https://github.com/microsoft/playwright-mcp and https://github.com/modelcontextprotocol/typescript-sdk .
