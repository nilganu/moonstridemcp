#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEnv } from "./env.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  loadEnv();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // NB: never write to stdout here — it carries the MCP protocol.
  process.stderr.write("moonstride-mcp (stdio) ready\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
