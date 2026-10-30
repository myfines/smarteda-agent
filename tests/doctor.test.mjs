import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { diagnose } from "../src/doctor.mjs";

test("doctor reports missing configuration without exposing paths or secrets", () => {
  const r = diagnose({
    nodeVersion: "22.1.0",
    env: { TOKEN: "SECRET" },
    exists: () => false,
  });
  assert.equal(r.ready, false);
  assert.equal(r.checks.find((c) => c.id === "profile").ok, false);
  assert.ok(!JSON.stringify(r).includes("SECRET"));
});
test("doctor checks configured browser and private profile without claiming live compatibility", () => {
  const r = diagnose({
    nodeVersion: "22.1.0",
    env: { SMARTEDA_PROFILE: "/private/profile", SMARTEDA_CHROME: "/chrome" },
    exists: (p) => p === "/chrome" || p === resolve("/private/profile"),
  });
  assert.equal(r.ready, true);
  assert.equal(r.liveCompatibilityVerified, false);
  assert.ok(!JSON.stringify(r).includes("/private/profile"));
});
test("doctor rejects unsupported Node and missing explicit Chrome", () => {
  const r = diagnose({
    nodeVersion: "18.0.0",
    env: { SMARTEDA_PROFILE: "/profile", SMARTEDA_CHROME: "/missing" },
    exists: (p) => p === resolve("/profile"),
  });
  assert.equal(r.ready, false);
  assert.equal(r.checks.find((c) => c.id === "node").ok, false);
  assert.equal(r.checks.find((c) => c.id === "chrome").ok, false);
});
