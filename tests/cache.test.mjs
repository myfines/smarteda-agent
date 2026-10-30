import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResourceCache, assetUrl } from "../src/cache.mjs";
test("cache accepts public shell/runtime only", () => {
  assert.equal(
    assetUrl("https://design.ismarteda.com/smartEDA.wasm").pathname,
    "/smartEDA.wasm",
  );
  for (const url of [
    "https://evil.test/x.js",
    "https://design.ismarteda.com/api/file/detail",
    "https://design.ismarteda.com/?token=secret",
  ])
    assert.throws(() => assetUrl(url));
});
test("persistent local resources survive restart and are served with isolation headers", async () => {
  const root = await mkdtemp(join(tmpdir(), "smarteda-cache-")),
    file = join(root, "runtime.wasm");
  await writeFile(file, Buffer.from([0, 97, 115, 109]));
  const cache = new ResourceCache(join(root, "cache"));
  await cache.save([
    { url: "https://design.ismarteda.com/smartEDA.wasm", path: file },
  ]);
  const restored = new ResourceCache(join(root, "cache"));
  const info = await restored.start();
  try {
    assert.equal((await restored.status()).entries.length, 1);
    assert.equal(
      (
        await fetch(
          info.endpoint +
            "/resource?url=" +
            encodeURIComponent("https://design.ismarteda.com/smartEDA.wasm"),
        )
      ).status,
      403,
    );
    const r = await fetch(
      info.endpoint +
        "/resource?url=" +
        encodeURIComponent("https://design.ismarteda.com/smartEDA.wasm"),
      { headers: { authorization: info.authorization } },
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cross-origin-embedder-policy"), "require-corp");
    assert.equal((await r.arrayBuffer()).byteLength, 4);
  } finally {
    await restored.close();
  }
});
test("failed batch preserves active manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "smarteda-cache-")),
    file = join(root, "shell.html");
  await writeFile(file, "<html></html>");
  const c = new ResourceCache(join(root, "cache"));
  await c.save([{ url: "https://design.ismarteda.com/", path: file }]);
  await assert.rejects(() =>
    c.save([
      {
        url: "https://design.ismarteda.com/smartEDA.wasm",
        path: join(root, "missing"),
      },
    ]),
  );
  assert.equal((await c.status()).entries.length, 1);
});
