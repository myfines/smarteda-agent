# SmartEDA Agent MCP

Nonvisual tools for SmartEDA's Qt/WASM circuit editor, plus a reusable Codex skill. Community project, tested against the October 2026 web application. No screenshot coordinates, OCR, or image model is required to operate the tools.

## Quick start

Requirements: Node.js 20+, Chrome, and an authorized SmartEDA account.

```sh
git clone https://github.com/myfines/smarteda-agent.git
cd smarteda-agent
npm ci
npm test
```

Configure your MCP client (replace both absolute paths):

```json
{
  "mcpServers": {
    "smarteda": {
      "command": "node",
      "args": ["/absolute/path/smarteda-agent/src/server.mjs"],
      "env": {
        "SMARTEDA_PROFILE": "/absolute/private/chrome-profile",
        "SMARTEDA_HEADLESS": "false",
        "SMARTEDA_OUTPUT": "/absolute/private/smarteda-output"
      }
    }
  }
}
```

Call `smarteda_open` with your own full simulator URL. Log in manually in the visible dedicated browser if required. Do not reuse a profile while another Chrome process owns it. Once authenticated, `SMARTEDA_HEADLESS=true` supports operation without a visible window. The first native initialization can be slow; `smarteda_read` reports engine-not-ready rather than pretending success.

## Tools

| Tool              | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| smarteda_open     | Open an explicitly selected official simulator URL                                |
| smarteda_read     | Read structured native components, connectors and captured simulation telemetry   |
| smarteda_validate | Validate XML and connector references offline                                     |
| smarteda_patch    | Change existing component properties offline; preserve IDs/topology               |
| smarteda_apply    | Back up cloud/native data, save multiline XML, reopen and verify properties/wires |
| smarteda_simulate | Reset/start or stop; capture actual native time/status callbacks                  |
| smarteda_export   | Download the official project archive through its DOM control                     |

`smarteda_apply` requires the current project's `expectedFileId` and an observed current frontend file module path. The tested path was `/assets/index-DRd14vBk.js`; do not assume it survives a platform update. On verification timeout, inspect the saved backup and current circuit before retrying. No automatic repeated mutation is performed.

**Numerical limitation:** the native canvas currently exposes no verified probe-voltage API. Read/apply/simulate/export work without vision, but native numerical voltage readout is explicitly marked unavailable. Simulation telemetry proves runtime advancement, not electrical correctness. Recorded screenshot readings are acceptance evidence, not a secretly substituted solver or a live MCP numerical endpoint.

## PT100 example

`examples/pt100-v2` contains an original 54-component/58-connector design: two buffers, three-wire compensation, zero offset and gain, RC filter, and three automatic comparator flags. The normal 100 C native output was about 1.540 V. At 180 C the overtemperature flag went high; finite short and high-resistance substitutions activated their corresponding fault flags. Fault flags take priority when interpreting temperature; the raw overtemperature flag can also be high during a high-resistance fault.

This is still a simulation front end: ideal 1mA source, ideal rails and generic op-amp/comparator models, no device-level source compliance/protection, no comparator hysteresis, no native ADC/MCU firmware. A 30k fault produces unrealistically high sensor voltage with the ideal source. Do not use this as a validated industrial hardware design.

For Codex, copy `skills/smarteda-agent` into your skills directory. Its optional standalone Playwright MCP caller has its own pinned package files; run `npm ci` in the installed skill directory if using that helper. Native model formats and recovery details are in the skill references.

## Verification and privacy

Run `npm test` (Node unit tests and real stdio MCP protocol tests) and `python -m unittest discover -s tests` (XML helper tests). The native case evidence is documented separately; automated offline tests do not imply live platform compatibility.

Keep profiles, cloud backups, exports, credentials and local logs private. The repository contains no account/project identifiers or proprietary runtime files. Runtime assets must be fetched from the authorized official site, not redistributed here. See [CONTRIBUTING.md](CONTRIBUTING.md) for the release checks.

Upstream: [Playwright MCP](https://github.com/microsoft/playwright-mcp), [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk). Original project code is MIT licensed; upstream dependencies retain their own licenses.
