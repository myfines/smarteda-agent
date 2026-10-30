import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
test("real stdio MCP discovery, validation, patch and explicit login requirement", async () => {
  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: {} },
  );
  const env = { ...process.env };
  delete env.SMARTEDA_PROFILE;
  try {
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: ["src/server.mjs"],
        env,
        stderr: "inherit",
      }),
    );
    assert.equal(
      client.getServerVersion().version,
      JSON.parse(await readFile("package.json", "utf8")).version,
    );
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 18);
    const xml = await readFile(
      "skills/smarteda-agent/assets/pt100.circuit",
      "utf8",
    );
    const result = await client.callTool({
      name: "smarteda_validate",
      arguments: { xml },
    });
    assert.equal(result.structuredContent.connectors, 13);
    const inspect = await client.callTool({
      name: "smarteda_inspect",
      arguments: { xml },
    });
    assert.equal(inspect.structuredContent.connectors, 13);
    const edit = await client.callTool({
      name: "smarteda_edit",
      arguments: { xml, clone: { ids: ["Resistor-1"], dx: 200, dy: 0 } },
    });
    assert.equal(edit.isError, undefined);
    assert.ok(edit.structuredContent.idMap["Resistor-1"]);
    const diff = await client.callTool({
      name: "smarteda_diff",
      arguments: { before: xml, after: edit.structuredContent.xml },
    });
    assert.equal(diff.structuredContent.added.length, 1);
    const patched = await client.callTool({
      name: "smarteda_patch",
      arguments: {
        xml,
        changes: [{ id: "Resistor-1", properties: { Resistance: "5 惟" } }],
      },
    });
    assert.match(patched.structuredContent.xml, /5 惟/);
    const error = await client.callTool({
      name: "smarteda_read",
      arguments: {},
    });
    assert.equal(error.isError, true);
    assert.match(error.content[0].text, /SMARTEDA_PROFILE/);
  } finally {
    await client.close();
  }
});
