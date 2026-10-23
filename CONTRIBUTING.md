# Contributing

Before proposing an operation, reproduce it against an authorized disposable project. Record the tested platform version/date and distinguish native readback, runtime telemetry, screenshot acceptance and offline calculations. Do not claim a numerical API from a screenshot or expected formula.

Add tests for XML or protocol behavior before changing it. Run npm test and the Python XML tests. Use npm ci and commit the lockfile. Keep stdout clean in the stdio server; diagnostics belong on stderr.

Never contribute credentials, browser profiles, private project URLs, cloud backups, vendor JavaScript/WASM/fonts, or copied circuit examples from proprietary platform assets. Native schemas observed during interoperability testing belong in references, with limitations stated.

Release checks: tests pass; manual native import/save/reopen and export are confirmed when relevant; public tracked files and Git history are scanned; examples match their documented scope. Do not publish tokens in bug reports. Frontend module hashes are version-dependent and must fail clearly when unsupported.
