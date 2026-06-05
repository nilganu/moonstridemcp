#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadEnv } from "./env.js";
import { createServer } from "./server.js";

const MCP_PATH = "/mcp";

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, mcp-session-id, mcp-protocol-version",
  );
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handleMcpPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Stateless: a fresh server + transport per request. Simple and robust for a
  // tool server with no long-lived subscriptions; works with any MCP client.
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  const body = await readJsonBody(req);
  await transport.handleRequest(req, res, body);
}

async function main(): Promise<void> {
  loadEnv();
  const port = Number(process.env.PORT ?? 8787);

  const httpServer = createHttpServer((req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (url.pathname === "/health") {
      sendJson(res, 200, { status: "ok", server: "moonstride-mcp" });
      return;
    }

    if (url.pathname !== MCP_PATH) {
      sendJson(res, 404, { error: "Not found. POST MCP requests to /mcp." });
      return;
    }

    // Optional bearer-token auth. When MCP_AUTH_TOKEN is set, every /mcp
    // request must present `Authorization: Bearer <token>`.
    const requiredToken = process.env.MCP_AUTH_TOKEN;
    if (requiredToken) {
      const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
      if (provided !== requiredToken) {
        sendJson(res, 401, {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized" },
          id: null,
        });
        return;
      }
    }

    if (req.method === "POST") {
      handleMcpPost(req, res).catch((err) => {
        process.stderr.write(`MCP request error: ${err?.stack ?? err}\n`);
        if (!res.headersSent) {
          sendJson(res, 500, {
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      });
      return;
    }

    // Stateless mode does not support GET (SSE stream) or session DELETE.
    sendJson(res, 405, {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST /mcp." },
      id: null,
    });
  });

  httpServer.listen(port, () => {
    process.stderr.write(
      `moonstride-mcp (streamable-http) listening on http://localhost:${port}${MCP_PATH}\n`,
    );
  });
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
