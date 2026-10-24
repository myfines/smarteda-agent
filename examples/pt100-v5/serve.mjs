// Local-only, read-only demo. Explicit allowlist prevents exposing the workspace.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.dirname(fileURLToPath(import.meta.url));
const avr = path.resolve(root, "../../node_modules/avr8js/dist/esm");
const allowed = new Set([
  "demo.html",
  "firmware.hex",
  "avr-machine.mjs",
  "validated-cases.json",
]);
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    const url = new URL(req.url, "http://localhost"),
      p = decodeURIComponent(url.pathname);
    let file;
    if (p.startsWith("/avr8js/")) {
      let relative = p.slice(8);
      if (!path.extname(relative)) relative += ".js";
      file = path.resolve(avr, relative);
      if (!file.startsWith(avr + path.sep)) throw Error("Path");
    } else {
      const name = p === "/" ? "demo.html" : p.slice(1);
      if (!allowed.has(name)) throw Error("Path");
      file = path.join(root, name);
    }
    const body = await readFile(file),
      type = file.endsWith(".html")
        ? "text/html; charset=utf-8"
        : file.endsWith(".json")
          ? "application/json"
          : /\.(mjs|js)$/.test(file)
            ? "text/javascript"
            : "text/plain";
    res
      .writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
const port = Number(process.env.PT100_PORT || 8766);
server.listen(port, "127.0.0.1", () =>
  console.log(`PT100 demo: http://127.0.0.1:${port}`),
);
