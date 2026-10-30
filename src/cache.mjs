import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve, relative, isAbsolute } from "node:path";
import { createServer } from "node:http";
export function assetUrl(value) {
  const u = new URL(value);
  if (
    u.origin !== "https://design.ismarteda.com" ||
    u.username ||
    u.password ||
    u.hash ||
    u.search ||
    !(
      u.pathname === "/" ||
      /^\/assets\/[^/]+\.(js|css|woff2?|ttf|wasm)$/.test(u.pathname) ||
      /^\/(smartEDA\.(js|wasm|worker\.js)|qtloader\.js)$/.test(u.pathname)
    )
  )
    throw Error(
      "Only query-free official public HTML/runtime/assets can be cached",
    );
  return u;
}
const hash = (b) => createHash("sha256").update(b).digest("hex");
function headersFor(url) {
  const path = new URL(url).pathname;
  return {
    "content-type":
      path === "/"
        ? "text/html; charset=utf-8"
        : path.endsWith(".wasm")
          ? "application/wasm"
          : path.endsWith(".js")
            ? "application/javascript"
            : path.endsWith(".css")
              ? "text/css"
              : path.endsWith(".woff2")
                ? "font/woff2"
                : path.endsWith(".woff")
                  ? "font/woff"
                  : "font/ttf",
    "cross-origin-embedder-policy": "require-corp",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
  };
}
export class ResourceCache {
  constructor(root) {
    this.root = resolve(root);
  }
  async manifest() {
    try {
      return JSON.parse(
        await readFile(join(this.root, "manifest.json"), "utf8"),
      );
    } catch (e) {
      if (e.code === "ENOENT") return { entries: [] };
      throw e;
    }
  }
  async save(entries, { discover = false } = {}) {
    if (!entries.length || entries.length > 200)
      throw Error("Supply 1..200 resources");
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const bundle = randomUUID(),
      dir = join(this.root, bundle);
    await mkdir(dir, { mode: 0o700 });
    const queue = [...entries],
      seen = new Set(),
      saved = [];
    for (let i = 0; i < queue.length; i++) {
      if (queue.length > 200)
        throw Error(
          "Resource discovery exceeds 200 entries; use an explicit batch",
        );
      const entry = queue[i],
        u = assetUrl(entry.url);
      if (seen.has(u.href)) continue;
      seen.add(u.href);
      let body,
        headers = headersFor(u.href);
      if (entry.path) {
        if ((await stat(entry.path)).size > 160 * 1024 * 1024)
          throw Error("Resource exceeds 160MiB");
        body = await readFile(entry.path);
      } else {
        const r = await fetch(u, {
          signal: AbortSignal.timeout(120000),
          redirect: "error",
        });
        if (!r.ok)
          throw Error(
            "Resource download HTTP " + r.status + " for " + u.pathname,
          );
        if (
          /no-store|private/i.test(r.headers.get("cache-control") || "") ||
          r.headers.has("set-cookie")
        )
          throw Error("Refusing private/cookie resource " + u.pathname);
        const chunks = [];
        let size = 0;
        for await (const chunk of r.body) {
          size += chunk.length;
          if (size > 160 * 1024 * 1024) throw Error("Resource exceeds 160MiB");
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
        for (const k of [
          "content-type",
          "cross-origin-embedder-policy",
          "cross-origin-opener-policy",
          "cross-origin-resource-policy",
          "access-control-allow-origin",
        ])
          if (r.headers.has(k)) headers[k] = r.headers.get(k);
      }
      if (
        u.pathname.endsWith(".wasm") &&
        body.subarray(0, 4).toString("hex") !== "0061736d"
      )
        throw Error("Invalid WASM resource");
      if (u.pathname !== "/" && /text\/html/.test(headers["content-type"]))
        throw Error("HTML returned for a runtime resource");
      const digest = hash(body),
        file = digest + ".bin";
      await writeFile(join(dir, file), body, { mode: 0o600 });
      saved.push({
        url: u.href,
        file: bundle + "/" + file,
        bytes: body.length,
        sha256: digest,
        headers,
      });
      if (discover && u.pathname === "/") {
        const text = body.toString("utf8");
        for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
          try {
            const url = assetUrl(new URL(match[1], u).href).href;
            if (!seen.has(url)) queue.push({ url });
          } catch {}
        }
      }
    }
    const manifest = {
      bundle,
      createdAt: new Date().toISOString(),
      entries: saved,
    };
    const temp = join(this.root, bundle + ".json");
    await writeFile(temp, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(temp, join(this.root, "manifest.json"));
    return this.status();
  }
  async status() {
    const m = await this.manifest();
    return {
      root: this.root,
      bundle: m.bundle ?? null,
      createdAt: m.createdAt ?? null,
      entries: m.entries.map(({ url, bytes, sha256 }) => ({
        url,
        bytes,
        sha256,
      })),
      bytes: m.entries.reduce((n, x) => n + x.bytes, 0),
    };
  }
  async start() {
    if (this.server) return this.connection;
    const token = randomUUID();
    this.server = createServer(async (req, res) => {
      try {
        if (req.headers.authorization !== "Bearer " + token) {
          res.writeHead(403).end();
          return;
        }
        const url = new URL(req.url, "http://localhost");
        if (req.method !== "GET" || url.pathname !== "/resource") {
          res.writeHead(404).end();
          return;
        }
        const target = assetUrl(url.searchParams.get("url")).href;
        const m = await this.manifest(),
          entry = m.entries.find((x) => x.url === target);
        if (!entry) {
          res.writeHead(404).end();
          return;
        }
        const file = resolve(this.root, entry.file);
        const rel = relative(this.root, file);
        if (rel.startsWith("..") || isAbsolute(rel))
          throw Error("Invalid cache path");
        const body = await readFile(file);
        if (hash(body) !== entry.sha256)
          throw Error("Cached resource checksum mismatch");
        res.writeHead(200, entry.headers);
        res.end(body);
      } catch {
        res.writeHead(500).end("Cache read failed");
      }
    });
    await new Promise((r, reject) => {
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", r);
    });
    this.connection = {
      endpoint: "http://127.0.0.1:" + this.server.address().port,
      authorization: "Bearer " + token,
    };
    return this.connection;
  }
  async close() {
    if (this.server) {
      await new Promise((r) => this.server.close(r));
      this.server = null;
    }
  }
}
export function cacheLoadCode(connection) {
  return String.raw`async(page)=>{const context=page.context();if(!context.__smartedaDiskCache){context.__smartedaDiskCache={enabled:true,hits:0,misses:0};await context.route('**/*',async route=>{const state=context.__smartedaDiskCache;const req=route.request();const u=new URL(req.url());const eligible=u.origin==='https://design.ismarteda.com'&&!u.search&&req.method()==='GET'&&(u.pathname==='/'||/^\/assets\/[^/]+\.(js|css|woff2?|ttf|wasm)$/.test(u.pathname)||/^\/(smartEDA\.(js|wasm|worker\.js)|qtloader\.js)$/.test(u.pathname));if(!state.enabled||!eligible)return route.fallback();const response=await context.request.get(${JSON.stringify(connection.endpoint)}+'/resource?url='+encodeURIComponent(u.href),{headers:{authorization:${JSON.stringify(connection.authorization)}},timeout:15000});try{if(response.status()===404){state.misses++;return await route.fallback();}if(!response.ok())throw Error('Local cache resource failed integrity/read check');state.hits++;const headers=response.headers();for(const key of ['content-encoding','content-length','transfer-encoding','connection','date'])delete headers[key];await route.fulfill({status:200,headers,body:await response.body()});}finally{await response.dispose();}});}context.__smartedaDiskCache.enabled=true;return {enabled:true,hits:context.__smartedaDiskCache.hits,misses:context.__smartedaDiskCache.misses}}`;
}
