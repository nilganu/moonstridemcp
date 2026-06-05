import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  MoonstrideApiError,
  MoonstrideClient,
  listEndpoints,
  toToolName,
  type EndpointDef,
} from "@moonstride/api-client";
import { z } from "zod";

export interface CreateServerOptions {
  client?: MoonstrideClient;
  name?: string;
  version?: string;
}

/** Reference data sets exposed via a single tool + MCP resources. */
const REFERENCE_SETS: Record<string, { endpoint: string; label: string }> = {
  "booking-statuses": { endpoint: "bookings.status", label: "Booking statuses" },
  "enquiry-statuses": { endpoint: "enquiries.status", label: "Enquiry statuses" },
  "pipeline-stages": { endpoint: "enquiries.pipelineStages", label: "Enquiry pipeline stages" },
  "task-enums": { endpoint: "tasks.enums", label: "Task enums" },
  currencies: { endpoint: "payment.currencies", label: "Currencies" },
  users: { endpoint: "admin.users", label: "Users" },
  "sell-channels": { endpoint: "b2b.sellChannels", label: "Sell channels" },
};

/** Pull the ZodRawShape out of an endpoint's input schema for the MCP SDK. */
function rawShape(endpoint: EndpointDef): z.ZodRawShape {
  const schema = endpoint.input as unknown as { shape?: z.ZodRawShape };
  return schema.shape ?? {};
}

/** Build a concise text summary so non-structured clients still get value. */
function summarize(endpoint: EndpointDef, result: unknown): string {
  const json = JSON.stringify(result, null, 2);
  const preview = json.length > 4_000 ? `${json.slice(0, 4_000)}\n… (truncated)` : json;
  let headline = `${endpoint.label} (${endpoint.id})`;
  if (Array.isArray(result)) headline += ` — ${result.length} item(s)`;
  return `${headline}\n\n${preview}`;
}

function toToolError(err: unknown) {
  const message =
    err instanceof MoonstrideApiError
      ? `Moonstride API error (${err.status || "network"}) on ${err.endpoint}: ${err.message}`
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

/**
 * Create a fully-configured MCP server exposing every Moonstride endpoint as a
 * tool, plus discovery/reference tools and reference resources. Transport-agnostic.
 */
export function createServer(opts: CreateServerOptions = {}): McpServer {
  const client = opts.client ?? new MoonstrideClient();
  const server = new McpServer({
    name: opts.name ?? "moonstride",
    version: opts.version ?? "0.1.0",
  });

  // ── One tool per endpoint ────────────────────────────────────────────
  for (const endpoint of listEndpoints()) {
    server.registerTool(
      toToolName(endpoint.id),
      {
        title: endpoint.label,
        description: `[${endpoint.category}] ${endpoint.description}`,
        inputSchema: rawShape(endpoint),
        outputSchema: { result: z.unknown() },
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await client.call(endpoint.id, args ?? {});
          return {
            content: [{ type: "text", text: summarize(endpoint, result) }],
            structuredContent: { result },
          };
        } catch (err) {
          return toToolError(err);
        }
      },
    );
  }

  // ── Discovery tool ───────────────────────────────────────────────────
  server.registerTool(
    "moonstride_list_endpoints",
    {
      title: "List Moonstride endpoints",
      description:
        "List every available Moonstride endpoint/tool with its category, method, path and description.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Optional category filter, e.g. Bookings, Enquiries"),
      },
      outputSchema: { result: z.unknown() },
    },
    async ({ category }) => {
      const items = listEndpoints()
        .filter((e) => !category || e.category.toLowerCase() === category.toLowerCase())
        .map((e) => ({
          id: e.id,
          tool: toToolName(e.id),
          category: e.category,
          label: e.label,
          method: e.method,
          path: e.path,
          description: e.description,
        }));
      return {
        content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
        structuredContent: { result: items },
      };
    },
  );

  // ── Reference data tool ──────────────────────────────────────────────
  server.registerTool(
    "moonstride_get_reference",
    {
      title: "Get Moonstride reference data",
      description: `Fetch a reference data set. One of: ${Object.keys(REFERENCE_SETS).join(", ")}.`,
      inputSchema: {
        kind: z
          .enum(Object.keys(REFERENCE_SETS) as [string, ...string[]])
          .describe("Which reference set to fetch"),
      },
      outputSchema: { result: z.unknown() },
    },
    async ({ kind }) => {
      const def = REFERENCE_SETS[kind];
      if (!def) return toToolError(new Error(`Unknown reference kind: ${kind}`));
      try {
        const result = await client.call(def.endpoint);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { result },
        };
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  // ── Reference resources (browsable without a tool call) ──────────────
  for (const [kind, def] of Object.entries(REFERENCE_SETS)) {
    server.registerResource(
      `moonstride-${kind}`,
      `moonstride://reference/${kind}`,
      {
        title: def.label,
        description: `Moonstride reference data: ${def.label}`,
        mimeType: "application/json",
      },
      async (uri) => {
        const result = await client.call(def.endpoint);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  return server;
}
