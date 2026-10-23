#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  parseCircuit,
  patchCircuit,
  assertTarget,
  buildReadCode,
  buildSimulationCode,
} from "./core.mjs";
const require = createRequire(import.meta.url);
let browser;
let connecting;
let chain = Promise.resolve();
const output = resolve(process.env.SMARTEDA_OUTPUT || "smarteda-output");
async function getBrowser() {
  if (browser) return browser;
  if (connecting) return connecting;
  connecting = (async () => {
    if (!process.env.SMARTEDA_PROFILE)
      throw Error(
        "Set SMARTEDA_PROFILE to a dedicated authorized Chrome profile",
      );
    const args = [
      join(dirname(require.resolve("@playwright/mcp/package.json")), "cli.js"),
      "--browser",
      "chrome",
      "--user-data-dir",
      resolve(process.env.SMARTEDA_PROFILE),
      "--image-responses",
      "omit",
    ];
    if (process.env.SMARTEDA_HEADLESS !== "false") args.push("--headless");
    const c = new Client(
      { name: "smarteda-native-backend", version: "0.2.0" },
      { capabilities: {} },
    );
    await c.connect(
      new StdioClientTransport({
        command: process.execPath,
        args,
        stderr: "inherit",
      }),
    );
    browser = c;
    return c;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}
function decode(result) {
  if (result.isError)
    throw Error(
      "Browser operation failed; inspect the private local browser logs",
    );
  for (const c of result.content || []) {
    if (c.type === "text" && c.text.includes("### Result\n")) {
      const value = c.text.split("### Result\n")[1];
      for (
        let end = value.length;
        end > 0;
        end = value.lastIndexOf("\n", end - 1)
      ) {
        try {
          return JSON.parse(value.slice(0, end));
        } catch {}
      }
    }
  }
  throw Error("Unexpected browser MCP response format");
}
async function run(code) {
  const c = await getBrowser();
  return decode(
    await c.callTool(
      { name: "browser_run_code_unsafe", arguments: { code } },
      undefined,
      { timeout: 90000 },
    ),
  );
}
async function snapshot() {
  const s = await run(buildReadCode());
  assertTarget(s.url);
  const m = parseCircuit(s.xml);
  return { ...s, components: m.components, connectors: m.connectors };
}
const server = new McpServer({ name: "smarteda-agent", version: "0.2.0" });
function tool(name, description, inputSchema, handler) {
  server.registerTool(name, { description, inputSchema }, async (args) => {
    const task = chain.then(async () => {
      try {
        const value = await handler(args);
        return {
          content: [{ type: "text", text: JSON.stringify(value) }],
          structuredContent: value,
        };
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: String(e.message) }],
        };
      }
    });
    chain = task.catch(() => {});
    return await task;
  });
}
tool(
  "smarteda_open",
  "Open a user-selected official SmartEDA simulator URL in the dedicated browser. Authentication may require manual login.",
  { url: z.string().url() },
  async ({ url }) => {
    assertTarget(url);
    const c = await getBrowser();
    const result = await c.callTool(
      { name: "browser_navigate", arguments: { url } },
      undefined,
      { timeout: 60000 },
    );
    if (result.isError) throw Error("Navigation failed");
    return {
      opened: true,
      nativeReady: false,
      next: "Call smarteda_read after native initialization; login manually if required",
    };
  },
);
tool(
  "smarteda_read",
  "Read native serialized components, wires and captured simulation telemetry. No screenshots.",
  {},
  async () => {
    const s = await snapshot();
    return {
      engine: s.engine,
      components: s.components,
      connectors: s.connectors,
      simulation: s.simulation,
      measurementAvailable: false,
    };
  },
);
tool(
  "smarteda_validate",
  "Validate circuit XML offline; does not contact or change the cloud.",
  { xml: z.string().max(5_000_000) },
  async ({ xml }) => {
    const m = parseCircuit(xml);
    return { components: m.components.length, connectors: m.connectors.length };
  },
);
tool(
  "smarteda_patch",
  "Patch existing component attributes offline. Does not save to the platform.",
  {
    xml: z.string().max(5_000_000),
    changes: z
      .array(
        z.object({
          id: z.string(),
          properties: z.record(z.string(), z.string()),
        }),
      )
      .max(100),
  },
  async ({ xml, changes }) => ({ xml: patchCircuit(xml, changes) }),
);
tool(
  "smarteda_simulate",
  "Start (resetting simulation) or stop; return actual native time/status callbacks, never inferred voltages.",
  { action: z.enum(["start", "stop"]) },
  async ({ action }) => {
    await snapshot();
    return await run(buildSimulationCode(action));
  },
);
tool(
  "smarteda_apply",
  "Back up the current cloud file then save multiline XML and verify native component properties/topology. Requires expectedFileId from the user-selected project URL.",
  {
    xml: z.string().max(5_000_000),
    expectedFileId: z.string().min(1),
    fileModule: z.string().regex(/^\/assets\/[A-Za-z0-9_-]+\.js$/),
  },
  async ({ xml, expectedFileId, fileModule }) => {
    const desired = parseCircuit(xml);
    const before = await snapshot();
    if (assertTarget(before.url) !== expectedFileId)
      throw Error("Target file mismatch");
    await mkdir(output, { recursive: true });
    const backup = join(output, randomUUID() + ".json");
    const original = await run(
      `async(page)=>await page.evaluate(async()=>{const id=new URLSearchParams(location.hash.split('?')[1]).get('file_id');const r=await fetch('https://e-backendprod.ismarteda.com:20506/api/file/detail?fileId='+encodeURIComponent(id));if(!r.ok)throw Error('Cloud backup HTTP '+r.status);const j=await r.json();if(!j.data||typeof j.data.content!=='string')throw Error('Unsupported cloud file detail');return j.data})`,
    );
    await writeFile(
      backup,
      JSON.stringify({ url: before.url, native: before.xml, cloud: original }),
      "utf8",
    );
    await run(
      `async(page)=>{await page.evaluate(async({xml,id,modulePath,setting})=>{if(new URLSearchParams(location.hash.split('?')[1]).get('file_id')!==id)throw Error('Target changed');qtLoader.module().__Z14handleStopCircv();const api=await import(modulePath);if(typeof api.u!=='function')throw Error('Unsupported file module');await api.u({fileId:id,content:xml,setting});qtLoader.module().__Z17handleOpenCircuitv()},${JSON.stringify({ xml: xml.replace(/></g, ">\n<"), id: expectedFileId, modulePath: fileModule, setting: original.setting })});return {requested:true}}`,
    );
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const after = await snapshot();
      const same = desired.components.every((c) => {
        const a = after.components.find(
          (x) => (x.CircId || x.uid) === (c.CircId || c.uid),
        );
        return (
          a &&
          Object.entries(c).every(
            ([k, v]) =>
              String(a[k]) === String(v) ||
              (Number.isFinite(Number(a[k])) &&
                Number.isFinite(Number(v)) &&
                Number(a[k]) === Number(v)) ||
              (c.itemtype === "RTD" && k === "res"),
          )
        );
      });
      const wires = desired.connectors.every((c) =>
        after.connectors.some(
          (a) =>
            a.startpinid === c.startpinid &&
            a.endpinid === c.endpinid &&
            a.pointList === c.pointList,
        ),
      );
      if (
        same &&
        wires &&
        after.components.length === desired.components.length &&
        after.connectors.length === desired.connectors.length
      )
        return {
          verified: true,
          backup,
          components: after.components.length,
          connectors: after.connectors.length,
        };
      await new Promise((r) => setTimeout(r, 250));
    }
    throw Error(
      "Cloud save requested but native verification timed out; backup: " +
        backup,
    );
  },
);
tool(
  "smarteda_export",
  "Download the official vendor project ZIP through the verified export control. Does not fabricate a vendor archive.",
  { expectedFileId: z.string().min(1) },
  async ({ expectedFileId }) => {
    const s = await snapshot();
    if (assertTarget(s.url) !== expectedFileId)
      throw Error("Target file mismatch");
    await mkdir(output, { recursive: true });
    const path = join(output, randomUUID() + ".zip");
    return await run(
      `async(page)=>{const pending=page.waitForEvent('download',{timeout:20000});await page.getByTitle('导出项目',{exact:true}).click();const download=await pending;const error=await download.failure();if(error)throw Error('Vendor export download failed');await download.saveAs(${JSON.stringify(path)});return {path:${JSON.stringify(path)},vendorFilename:download.suggestedFilename()}}`,
    );
  },
);
await server.connect(new StdioServerTransport());
async function close() {
  await browser?.close();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
