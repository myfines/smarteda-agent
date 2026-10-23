# Recorded live validation

Seven native cases were executed and serialized in SmartEDA on 2026-10-23. Each case contained 13 connectors and case-specific component checks. `assets/cases` contains the resulting native readbacks.

|Case|VA mV|VB mV|Compensated ohms|
|---|---:|---:|---:|
|0 C|103.999|101.999|99.999|
|100 C, leads 2 ohms|142.505|140.505|138.505|
|200 C|179.855|177.855|175.855|
|100 C, matched 5 ohms|148.505|143.505|138.505|
|100 C, leads 5/2 ohms|145.505|140.505|135.505|

Short substituted 1 milliohm; high resistance substituted 30 kilohms. They are finite fault approximations. The normal 100 C case was restored, saved and read back with 13 connectors. Screenshots were captured during the earlier seven-case run; a later final-reopen screenshot timed out on font loading, while subsequent XML readback succeeded. No completed later screenshot is claimed.

Local package checks: 4 Python unit tests, 14-component/13-wire example validation, Codex skill validation, official Playwright MCP tool discovery, and a real browser_tabs request using the reusable helper. This does not prove future frontend compatibility.
