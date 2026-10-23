// One bounded official Playwright MCP call. Profile/output paths are caller supplied.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const [profile, requestFile] = process.argv.slice(2);
if (!profile || !requestFile) throw new Error('Usage: node mcp-call.mjs PROFILE REQUEST.json|--list');
const cli = join(dirname(require.resolve('@playwright/mcp/package.json')), 'cli.js');
const transport = new StdioClientTransport({command:process.execPath,args:[cli,'--browser','chrome','--headless','--user-data-dir',profile,'--image-responses','omit'],stderr:'pipe'});
const client = new Client({name:'smarteda-agent',version:'0.1.0'},{capabilities:{}});
try {
  await client.connect(transport);
  if(requestFile==='--list') console.log(JSON.stringify(await client.listTools()));
  else {
    const req=JSON.parse(await readFile(requestFile,'utf8'));
    console.log(JSON.stringify(await client.callTool({name:req.name,arguments:req.args||{}},undefined,{timeout:120000})));
  }
} finally { await client.close(); }
