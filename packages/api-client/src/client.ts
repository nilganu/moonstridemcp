import {
  configFromEnv,
  resolveConfig,
  type MoonstrideConfig,
  type MoonstrideConfigInput,
} from "./config.js";
import { TokenManager } from "./auth.js";
import { MoonstrideApiError } from "./errors.js";
import { buildQuery, rawFetch, type QueryParams } from "./http.js";
import { getEndpoint, listEndpoints, type EndpointDef } from "./registry.js";

export interface CallOptions {
  /** Override the request timeout for this call. */
  timeoutMs?: number;
}

/**
 * High-level Moonstride API client. Handles token generation/refresh,
 * validates params against the endpoint registry, builds the request, and
 * transparently retries once on an auth error.
 */
export class MoonstrideClient {
  private readonly configInput?: MoonstrideConfigInput;
  private resolved: { config: MoonstrideConfig; tokens: TokenManager } | null = null;

  /**
   * Config is resolved lazily on first API call, so a client can be
   * constructed (and endpoints discovered) before credentials are present.
   */
  constructor(config?: MoonstrideConfigInput) {
    this.configInput = config;
  }

  /** Resolved, validated config. Throws if credentials are missing/invalid. */
  get config(): MoonstrideConfig {
    return this.ensure().config;
  }

  private ensure(): { config: MoonstrideConfig; tokens: TokenManager } {
    if (!this.resolved) {
      const config = this.configInput
        ? resolveConfig(this.configInput)
        : configFromEnv();
      this.resolved = { config, tokens: new TokenManager(config) };
    }
    return this.resolved;
  }

  /** Build a client from environment variables. */
  static fromEnv(env?: Record<string, string | undefined>): MoonstrideClient {
    const cfg = env ? configFromEnv(env) : configFromEnv();
    return new MoonstrideClient(cfg);
  }

  /** List all registered endpoints (for discovery / UIs). */
  endpoints(): readonly EndpointDef[] {
    return listEndpoints();
  }

  /**
   * Call any registered endpoint by id with raw params. Params are validated
   * against the endpoint's schema before the request is made.
   */
  async call<T = unknown>(
    endpointId: string,
    params: Record<string, unknown> = {},
    opts: CallOptions = {},
  ): Promise<T> {
    const endpoint = getEndpoint(endpointId);
    if (!endpoint) {
      throw new MoonstrideApiError({
        message: `Unknown endpoint id: ${endpointId}`,
        status: 0,
        endpoint: endpointId,
      });
    }

    const parsed = endpoint.input.parse(params) as Record<string, unknown>;
    const target = endpoint.paramTarget ?? (endpoint.method === "GET" ? "query" : "body");

    const { config } = this.ensure();
    const base = config.baseUrl.replace(/\/$/, "");
    let url = `${base}${endpoint.path}`;
    let body: unknown;

    if (target === "split") {
      // Search endpoints: paging/sort/quote go in the query, structured filter
      // criteria go in the POST body (PascalCase, e.g. {TravelStartDate:{From,To}}).
      const { filter, ...rest } = parsed as { filter?: unknown } & Record<string, unknown>;
      const qs = buildQuery(rest as QueryParams);
      if (qs) url += `?${qs}`;
      body = (filter as Record<string, unknown>) ?? {};
    } else if (target === "query") {
      const qs = buildQuery(parsed as QueryParams);
      if (qs) url += `?${qs}`;
      // POST statistics endpoints take filters as query params but still expect
      // a JSON body — send an empty object so the request is well-formed.
      if (endpoint.method === "POST") body = {};
    } else {
      body = parsed;
    }

    return this.requestWithAuthRetry<T>(endpoint, url, body, opts);
  }

  private async requestWithAuthRetry<T>(
    endpoint: EndpointDef,
    url: string,
    body: unknown,
    opts: CallOptions,
  ): Promise<T> {
    const { config, tokens } = this.ensure();
    const doRequest = async (): Promise<T> => {
      const token = await tokens.getToken();
      return rawFetch<T>(url, {
        method: endpoint.method,
        headers: {
          token,
          accept: "application/json",
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body,
        timeoutMs: opts.timeoutMs ?? config.timeoutMs,
        maxRetries: config.maxRetries,
        endpoint: endpoint.id,
      });
    };

    try {
      return await doRequest();
    } catch (err) {
      if (err instanceof MoonstrideApiError && err.isAuthError) {
        // Token may have expired server-side — refresh once and retry.
        tokens.invalidate();
        return doRequest();
      }
      throw err;
    }
  }
}
