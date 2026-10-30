# Network recovery and feedback

## What is recovered

The official design origin's static GETs and query-free root document use up to three attempts for transport failures and 408/429/500/502/503/504, with 30 seconds per attempt (90 seconds for unversioned native JS/WASM) and bounded backoff. No certificate bypass, mirrored vendor files, automatic reload, cloud API replay or repeated save is used.

Version-hashed JS/CSS/fonts can be cached in 32MiB of private session memory. Cookies, private/no-store/no-cache responses, query-string resources, varying authorization/cookies, HTML and unversioned runtimes are excluded. Required COOP/COEP/CORP headers are retained. The browser session blocks service workers so recovery routes are effective.

## Verification

- 29 Node tests and six Python tests passed locally.
- Real Chrome fault injection: upstream first returns503, the asset recovers on the second attempt; second request hits cache; isolation remains active; POST is sent only once.
- Actual stdio MCP startup successfully installed recovery and returned diagnostics through smarteda_network.
- This does not establish complete logged-in simulation compatibility or a fix to the vendor's infrastructure.

## Known limits

Retries cannot fix a sustained outage. Large unversioned WASM still needs a successful network transfer. Cache is discarded when the browser/server ends. Request payloads and full URLs are intentionally absent from shared diagnostics. For a write timeout, inspect the saved cloud state and backup before making any retry decision.

## Verified official contact

SmartEDA homepage links its parent company at https://www.3drocks.org/ . That company's contact page https://www.3drocks.org/lylx publishes support@3drocks.org and identifies 达客智数（广州）科技有限公司. Feedback can be sent there asking for forwarding to the SmartEDA technical team. This is a company support mailbox, not a confirmed dedicated SmartEDA engineering address. No official endorsement is implied.

## Explicit persistent bundles (0.8)

smarteda_cache_save / smarteda_cache_status / smarteda_cache_load / smarteda_reload expose the previously manual local-file recovery path to AI agents. This explicit bundle cache supports matching HTML, unversioned JS/WASM, workers and fonts; it is distinct from the conservative automatic in-memory cache described above. Entries can be imported from local downloads. An authenticated loopback bridge serves file bytes without including them in MCP output.

A real Chrome test with upstream blocked successfully loaded a local HTML fixture, retained isolation and compiled a minimal WASM fixture. This test is not a claim of full offline SmartEDA support. The online read-only probe returned page HTTP200 but timed out on a main script/font under the earlier 10-second budget; timeout budgets were increased based on that evidence. Complete live engine recovery was not certified in this release.
