import { MoonstrideApiError } from "./errors.js";

/** A query value. Arrays are joined with commas (Moonstride uses CSV, e.g. `status=COMP,CONF`). */
export type QueryValue =
  | string
  | number
  | boolean
  | Date
  | Array<string | number>
  | null
  | undefined;

export type QueryParams = Record<string, QueryValue>;

/** Serialize a params object into a query string (without leading `?`). */
export function buildQuery(params: QueryParams = {}): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      usp.set(key, value.join(","));
    } else if (value instanceof Date) {
      // Moonstride date params are YYYY-MM-DD.
      usp.set(key, value.toISOString().slice(0, 10));
    } else {
      usp.set(key, String(value));
    }
  }
  return usp.toString();
}

export interface RawRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
  maxRetries: number;
  /** Label used in thrown errors (endpoint id or path). */
  endpoint: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level fetch with timeout, exponential-backoff retry on 429/5xx, and
 * error normalization. Parses JSON and surfaces the `{ "Error": "..." }`
 * shape as a {@link MoonstrideApiError}.
 */
export async function rawFetch<T = unknown>(
  url: string,
  opts: RawRequestOptions,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const response = await fetch(url, {
        method: opts.method,
        headers: opts.headers,
        body:
          opts.body === undefined
            ? undefined
            : typeof opts.body === "string"
              ? opts.body
              : JSON.stringify(opts.body),
        signal: controller.signal,
      });

      const text = await response.text();
      const data = parseMaybeJson(text);

      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < opts.maxRetries) {
          lastError = new MoonstrideApiError({
            message: extractErrorMessage(data) ?? `HTTP ${response.status}`,
            status: response.status,
            endpoint: opts.endpoint,
            body: data,
          });
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new MoonstrideApiError({
          message: extractErrorMessage(data) ?? `HTTP ${response.status}`,
          status: response.status,
          endpoint: opts.endpoint,
          body: data,
        });
      }

      // Some endpoints return 200 with an `{ Error: ... }` body.
      const embeddedError = extractErrorMessage(data);
      if (embeddedError) {
        throw new MoonstrideApiError({
          message: embeddedError,
          status: response.status,
          endpoint: opts.endpoint,
          body: data,
        });
      }

      return data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof MoonstrideApiError) throw err;
      // Network/abort errors are retryable.
      lastError = normalizeNetworkError(err, opts.endpoint);
      if (attempt < opts.maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Request to ${opts.endpoint} failed`);
}

function backoffMs(attempt: number): number {
  return Math.min(2_000, 200 * 2 ** attempt);
}

function parseMaybeJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Moonstride uses both `{ "Error": "..." }` and `{ "error": "..." }`. */
function extractErrorMessage(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidate = obj.Error ?? obj.error;
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

function normalizeNetworkError(err: unknown, endpoint: string): MoonstrideApiError {
  const isAbort = err instanceof Error && err.name === "AbortError";
  return new MoonstrideApiError({
    message: isAbort
      ? `Request to ${endpoint} timed out`
      : `Network error calling ${endpoint}: ${(err as Error)?.message ?? String(err)}`,
    status: 0,
    endpoint,
    body: undefined,
  });
}
