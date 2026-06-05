import { afterEach, describe, expect, it, vi } from "vitest";
import { MoonstrideClient } from "./client.js";
import { buildQuery } from "./http.js";
import { ENDPOINTS, fromToolName, toToolName } from "./registry.js";
import { MoonstrideApiError } from "./errors.js";

const baseConfig = {
  baseUrl: "https://api.test.local",
  apiKey: "test-api-key",
  clientId: "test-client",
  secretKey: "test-secret",
  userId: "test-user",
  maxRetries: 0,
};

interface MockCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** Install a fetch mock that records calls and replies from a queue. */
function mockFetch(replies: Array<{ status?: number; json: unknown }>) {
  const calls: MockCall[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: String(init.method),
      headers: init.headers as Record<string, string>,
      body: init.body as string | undefined,
    });
    const reply = replies[Math.min(i, replies.length - 1)];
    i += 1;
    return new Response(JSON.stringify(reply.json), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

const tokenReply = {
  json: {
    status: true,
    response: {
      accessToken: "ACCESS#client",
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildQuery", () => {
  it("joins arrays as CSV and formats dates", () => {
    expect(buildQuery({ status: ["COMP", "CONF"], quote: true })).toBe(
      "status=COMP%2CCONF&quote=true",
    );
    expect(buildQuery({ from: new Date("2024-04-02T10:00:00Z") })).toBe(
      "from=2024-04-02",
    );
  });

  it("omits null/undefined/empty values", () => {
    expect(buildQuery({ a: undefined, b: null, c: "", d: "x" })).toBe("d=x");
  });
});

describe("registry", () => {
  it("has unique ids and round-trips tool names", () => {
    const ids = new Set(ENDPOINTS.map((e) => e.id));
    expect(ids.size).toBe(ENDPOINTS.length);
    for (const e of ENDPOINTS) {
      expect(fromToolName(toToolName(e.id))).toBe(e.id);
    }
  });
});

describe("MoonstrideClient.call", () => {
  it("generates a token then calls the endpoint with the token header", async () => {
    const calls = mockFetch([
      tokenReply,
      { json: { count: 42 } },
    ]);
    const client = new MoonstrideClient(baseConfig);
    const result = await client.call<{ count: number }>("bookings.count", {
      from: "2024-04-02",
      to: "2024-04-08",
      status: ["COMP", "CONF"],
    });

    expect(result).toEqual({ count: 42 });
    // First call = token generation.
    expect(calls[0]!.url).toBe(
      "https://api.test.local/authentication/generatetoken",
    );
    expect(calls[0]!.headers["x-api-key"]).toBe("test-api-key");
    expect(calls[0]!.headers.clientid).toBe("test-client");
    // Second call = the endpoint, with token header + query string.
    expect(calls[1]!.url).toBe(
      "https://api.test.local/api/crm/v2/bookings/count?from=2024-04-02&to=2024-04-08&status=COMP%2CCONF",
    );
    expect(calls[1]!.headers.token).toBe("ACCESS#client");
  });

  it("reuses the cached token across calls", async () => {
    const calls = mockFetch([tokenReply, { json: {} }, { json: {} }]);
    const client = new MoonstrideClient(baseConfig);
    await client.call("payment.currencies");
    await client.call("b2b.sellChannels");
    const tokenCalls = calls.filter((c) =>
      c.url.endsWith("/authentication/generatetoken"),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it("refreshes the token once and retries on a 401", async () => {
    const calls = mockFetch([
      tokenReply, // initial token
      { status: 401, json: { Error: "Authorization token is missing" } },
      tokenReply, // regenerated token
      { json: { ok: true } }, // retried endpoint call
    ]);
    const client = new MoonstrideClient(baseConfig);
    const result = await client.call<{ ok: boolean }>("bookings.statistics");
    expect(result).toEqual({ ok: true });
    const tokenCalls = calls.filter((c) =>
      c.url.endsWith("/authentication/generatetoken"),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it("surfaces an embedded { Error } body as MoonstrideApiError", async () => {
    mockFetch([
      tokenReply,
      { json: { Error: "Access to this component is not authorized for this user" } },
    ]);
    const client = new MoonstrideClient(baseConfig);
    await expect(client.call("bookings.search")).rejects.toBeInstanceOf(
      MoonstrideApiError,
    );
  });

  it("rejects unknown endpoint ids", async () => {
    mockFetch([tokenReply]);
    const client = new MoonstrideClient(baseConfig);
    await expect(client.call("does.not.exist")).rejects.toThrow(/Unknown endpoint/);
  });

  it("validates params and rejects bad dates", async () => {
    mockFetch([tokenReply]);
    const client = new MoonstrideClient(baseConfig);
    await expect(
      client.call("bookings.count", { from: "02-04-2024" }),
    ).rejects.toThrow();
  });
});
