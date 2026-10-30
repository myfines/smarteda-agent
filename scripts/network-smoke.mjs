import { createServer } from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildNetworkCode } from "../src/network.mjs";
let assetRequests = 0,
  posts = 0;
const upstream = createServer((req, res) => {
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-embedder-policy", "require-corp");
  if (req.method === "POST") {
    posts++;
    res.writeHead(503);
    res.end("unavailable");
    return;
  }
  if (req.url.startsWith("/assets/")) {
    assetRequests++;
    res.setHeader("content-type", "application/javascript");
    res.writeHead(assetRequests === 1 ? 503 : 200);
    res.end("globalThis.smoke=true");
    return;
  }
  res.setHeader("content-type", "text/html");
  res.end("<!doctype html><title>Recovery smoke</title>");
});
await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ serviceWorkers: "block" }),
    page = await ctx.newPage();
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  // Only the test harness substitutes a local fault-injection upstream.
  const wrappedContext = {
    route: async (pattern, handler) =>
      ctx.route(pattern, async (route) => {
        const original = route.request();
        await handler({
          request: () => original,
          fetch: (options) =>
            route.fetch({
              ...options,
              url: upstreamUrl + new URL(original.url()).pathname,
            }),
          continue: () =>
            route
              .fetch({
                url: upstreamUrl + new URL(original.url()).pathname,
                maxRetries: 0,
              })
              .then((response) => route.fulfill({ response })),
          fulfill: (options) => route.fulfill(options),
          abort: (reason) => route.abort(reason),
        });
      }),
  };
  const wrappedPage = { context: () => wrappedContext };
  const install = new Function(
    "return (" + buildNetworkCode({ delayMs: 0 }) + ")",
  )();
  await install(wrappedPage);
  await page.goto("https://design.ismarteda.com/");
  const result = await page.evaluate(async () => {
    const first = await fetch("/assets/test-AbCdEf12.js");
    const a = await first.text();
    const second = await fetch("/assets/test-AbCdEf12.js");
    const b = await second.text();
    const post = await fetch("/api/save", { method: "POST", body: "test" });
    return {
      same: a === b,
      status: post.status,
      isolated: crossOriginIsolated,
    };
  });
  assert.equal(assetRequests, 2);
  assert.equal(posts, 1);
  assert.equal(result.status, 503);
  assert.equal(result.same, true);
  assert.equal(result.isolated, true);
  const report = await install(wrappedPage);
  assert.equal(report.retries, 1);
  assert.equal(report.cacheHits, 1);
  console.log(
    JSON.stringify({
      passed: true,
      browser: "Chrome",
      faultInjection: "local upstream",
      assetRequests,
      posts,
      report,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((r) => upstream.close(r));
}
