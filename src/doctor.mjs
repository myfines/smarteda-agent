#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export function diagnose({
  nodeVersion = process.versions.node,
  env = process.env,
  exists = existsSync,
  platform = process.platform,
} = {}) {
  const checks = [];
  const add = (id, ok, message) => checks.push({ id, ok, message });
  add(
    "node",
    Number(nodeVersion.split(".")[0]) >= 20,
    "Node.js 20 or newer is required.",
  );
  add(
    "profile",
    Boolean(env.SMARTEDA_PROFILE && exists(resolve(env.SMARTEDA_PROFILE))),
    "Set SMARTEDA_PROFILE to an existing dedicated profile directory; first login requires a visible browser.",
  );
  const candidates = env.SMARTEDA_CHROME
    ? [env.SMARTEDA_CHROME]
    : platform === "win32"
      ? [
          join(
            env.PROGRAMFILES || "C:/Program Files",
            "Google/Chrome/Application/chrome.exe",
          ),
          join(
            env.LOCALAPPDATA || "C:/Users/Default/AppData/Local",
            "Google/Chrome/Application/chrome.exe",
          ),
        ]
      : platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
  add(
    "chrome",
    candidates.some((p) => exists(p)),
    "Install Chrome in a standard location or set SMARTEDA_CHROME to its executable.",
  );
  return {
    ready: checks.every((c) => c.ok),
    liveCompatibilityVerified: false,
    checks,
    next: "Run smarteda_open in a dedicated visible browser, then smarteda_read. Offline readiness does not verify authentication or the current vendor runtime.",
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = diagnose();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ready ? 0 : 1;
}
