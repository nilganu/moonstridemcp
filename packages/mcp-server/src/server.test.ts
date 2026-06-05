import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { MoonstrideClient, listEndpoints, toToolName } from "@moonstride/api-client";
import { createServer } from "./server.js";

const baseConfig = {
  baseUrl: "https://api.test.local",
  apiKey: "k",
  clientId: "c",
  secretKey: "s",
  userId: "u",
  maxRetries: 0,
};

function stubFetch(dataByUrlPart: Array<{ match: string; json: unknown }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/authentication/generatetoken")) {
        return new Response(
          JSON.stringify({
            response: {
              accessToken: "TOKEN",
              accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      const hit = dataByUrlPart.find((d) => url.includes(d.match));
      return new Response(JSON.stringify(hit?.json ?? {}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

async function connectedClient() {
  const moonstride = new MoonstrideClient(baseConfig);
  const server = createServer({ client: moonstride });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return { client, server };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MCP server", () => {
  it("registers a tool for every endpoint plus discovery tools", async () => {
    stubFetch([]);
    const { client } = await connectedClient();
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));

    for (const e of listEndpoints()) {
      expect(names.has(toToolName(e.id))).toBe(true);
    }
    expect(names.has("moonstride_list_endpoints")).toBe(true);
    expect(names.has("moonstride_get_reference")).toBe(true);
  });

  it("list_endpoints returns the registry", async () => {
    stubFetch([]);
    const { client } = await connectedClient();
    const res = await client.callTool({
      name: "moonstride_list_endpoints",
      arguments: { category: "Bookings" },
    });
    const structured = res.structuredContent as { result: unknown[] };
    expect(Array.isArray(structured.result)).toBe(true);
    expect(structured.result.length).toBeGreaterThan(0);
  });

  it("an endpoint tool calls the API and returns structured content", async () => {
    stubFetch([{ match: "/bookings/count", json: { count: 7 } }]);
    const { client } = await connectedClient();
    const res = await client.callTool({
      name: "moonstride_bookings_count",
      arguments: { from: "2024-04-02", to: "2024-04-08" },
    });
    expect(res.structuredContent).toEqual({ result: { count: 7 } });
    expect(res.isError).toBeFalsy();
  });

  it("surfaces API errors as tool errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/authentication/generatetoken")) {
          return new Response(
            JSON.stringify({ response: { accessToken: "T" } }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ Error: "nope" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const { client } = await connectedClient();
    const res = await client.callTool({
      name: "moonstride_customers_count",
      arguments: {},
    });
    expect(res.isError).toBe(true);
  });
});
