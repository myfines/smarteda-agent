import { chromium } from "playwright";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { ResourceCache, cacheLoadCode } from "../src/cache.mjs";
const root = await mkdtemp(join(tmpdir(), "smarteda-cache-browser-"));
const html = join(root, "index.html"),
  wasm = join(root, "app.wasm");
await writeFile(html, "<!doctype html><title>Cached shell</title>");
await writeFile(wasm, Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
const cache = new ResourceCache(join(root, "cache"));
await cache.save([
  { url: "https://design.ismarteda.com/", path: html },
  { url: "https://design.ismarteda.com/smartEDA.wasm", path: wasm },
]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: "block" }),
    page = await context.newPage();
  await context.route("**/*", (r) => r.abort());
  const install = new Function(
    "return (" + cacheLoadCode(await cache.start()) + ")",
  )();
  await install(page);
  await page.goto("https://design.ismarteda.com/");
  const result = await page.evaluate(async () => {
    const r = await fetch("/smartEDA.wasm");
    await WebAssembly.compile(await r.arrayBuffer());
    return { title: document.title, isolated: crossOriginIsolated };
  });
  assert.equal(result.title, "Cached shell");
  assert.equal(result.isolated, true);
  assert.equal(context.__smartedaDiskCache.hits, 2);
  console.log(
    JSON.stringify({
      passed: true,
      upstream: "blocked",
      wasmCompiled: true,
      ...result,
      cacheHits: context.__smartedaDiskCache.hits,
    }),
  );
} finally {
  await browser.close();
  await cache.close();
}
