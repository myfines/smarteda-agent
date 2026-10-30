import test from "node:test";
import assert from "node:assert/strict";
import { installNetworkRecovery } from "../src/network.mjs";
function harness() {
  const handlers = {};
  let handler;
  const ctx = {
    on: (e, h) => (handlers[e] = h),
    route: async (_, h) => {
      handler = h;
    },
  };
  return {
    page: { context: () => ctx },
    ctx,
    run: async ({
      url = "https://design.ismarteda.com/assets/index-abC123.js",
      method = "GET",
      responses = [],
    } = {}) => {
      let fetches = 0,
        continued = 0,
        fulfilled,
        aborted;
      const request = {
        url: () => url,
        method: () => method,
        resourceType: () => "script",
      };
      const route = {
        request: () => request,
        continue: async () => {
          continued++;
        },
        abort: async () => {
          aborted = true;
        },
        fetch: async () => {
          const x = responses[fetches++];
          if (x instanceof Error) throw x;
          return x;
        },
        fulfill: async (r) => {
          fulfilled = r;
        },
      };
      await handler(route);
      return { fetches, continued, fulfilled, aborted };
    },
  };
}
const response = (
  status = 200,
  headers = {
    "content-type": "application/javascript",
    "cross-origin-embedder-policy": "require-corp",
  },
  body = "ok",
) => ({
  status: () => status,
  headers: () => headers,
  body: async () => Buffer.from(body),
});
test("transient static fetch retries then hashed assets are cached with isolation headers", async () => {
  const h = harness();
  await installNetworkRecovery(h.page, { delayMs: 0 });
  const r = await h.run({ responses: [response(503), response()] });
  assert.equal(r.fetches, 2);
  const hit = await h.run();
  assert.equal(hit.fetches, 0);
  assert.equal(
    hit.fulfilled.headers["cross-origin-embedder-policy"],
    "require-corp",
  );
});
test("never intercept POST, API GET or third-party assets", async () => {
  const h = harness();
  await installNetworkRecovery(h.page, { delayMs: 0 });
  for (const x of [
    { method: "POST" },
    { url: "https://design.ismarteda.com/api/file/detail?secret=x" },
    { url: "https://elsewhere.test/assets/index-abc.js" },
  ])
    assert.equal((await h.run(x)).continued, 1);
});
test("401 and 404 are not retried, no-store and bad MIME are not cached", async () => {
  const h = harness();
  await installNetworkRecovery(h.page, { delayMs: 0 });
  for (const status of [401, 404])
    assert.equal((await h.run({ responses: [response(status)] })).fetches, 1);
  for (const headers of [
    { "content-type": "application/javascript", "cache-control": "no-store" },
    { "content-type": "text/html" },
  ]) {
    await h.run({ responses: [response(200, headers)] });
    assert.equal((await h.run({ responses: [response()] })).fetches, 1);
    h.ctx.__smartedaNetwork.cache.clear();
  }
});
test("bounded failure aborts and telemetry excludes URL, token and error details", async () => {
  const h = harness();
  await installNetworkRecovery(h.page, { delayMs: 0 });
  const r = await h.run({
    url: "https://design.ismarteda.com/smartEDA.wasm?token=SECRET",
    responses: [new Error("SECRET"), new Error("SECRET"), new Error("SECRET")],
  });
  assert.equal(r.fetches, 3);
  assert.equal(r.aborted, true);
  const report = await installNetworkRecovery(h.page);
  assert.equal(report.failures, 1);
  assert.ok(!JSON.stringify(report).includes("SECRET"));
});
test("cache respects memory budget and does not cache unversioned runtime", async () => {
  const h = harness();
  await installNetworkRecovery(h.page, { delayMs: 0, maxCacheBytes: 1 });
  await h.run({ responses: [response()] });
  assert.equal((await h.run({ responses: [response()] })).fetches, 1);
  await h.run({
    url: "https://design.ismarteda.com/smartEDA.js",
    responses: [response()],
  });
  assert.equal(
    (
      await h.run({
        url: "https://design.ismarteda.com/smartEDA.js",
        responses: [response()],
      })
    ).fetches,
    1,
  );
});
