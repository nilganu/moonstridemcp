import type { MoonstrideConfig } from "./config.js";
import { MoonstrideAuthError } from "./errors.js";
import { rawFetch } from "./http.js";

/** Shape of the `generatetoken` response (the parts we rely on). */
export interface TokenResponse {
  status?: boolean;
  successMessage?: string;
  response?: {
    accessToken: string;
    accessTokenExpiresAt?: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: string;
    client?: { id?: string };
    user?: { userid?: string };
  };
}

interface CachedToken {
  accessToken: string;
  /** Epoch ms after which the token is considered stale. */
  expiresAtMs: number;
}

/** Refresh this many ms before the real expiry to avoid edge races. */
const EXPIRY_SKEW_MS = 60_000;
/** Fallback lifetime if the API omits `accessTokenExpiresAt`. */
const DEFAULT_TTL_MS = 30 * 60_000;

/**
 * Generates and caches a Moonstride access token, refreshing it before
 * expiry. Concurrency-safe: simultaneous callers share one in-flight request.
 */
export class TokenManager {
  private cached: CachedToken | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly config: MoonstrideConfig,
    /** Injectable clock for testing. */
    private readonly now: () => number = Date.now,
  ) {}

  /** Return a valid access token, generating/refreshing as needed. */
  async getToken(): Promise<string> {
    if (this.cached && this.cached.expiresAtMs > this.now()) {
      return this.cached.accessToken;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.generate()
      .then((token) => {
        this.inFlight = null;
        return token;
      })
      .catch((err) => {
        this.inFlight = null;
        throw err;
      });
    return this.inFlight;
  }

  /** Force the next {@link getToken} to regenerate (e.g. after a 401). */
  invalidate(): void {
    this.cached = null;
  }

  private async generate(): Promise<string> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/authentication/generatetoken`;
    let data: TokenResponse;
    try {
      data = await rawFetch<TokenResponse>(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.config.apiKey,
          clientid: this.config.clientId,
        },
        body: {
          secretkey: this.config.secretKey,
          userid: this.config.userId,
        },
        timeoutMs: this.config.timeoutMs,
        maxRetries: this.config.maxRetries,
        endpoint: "/authentication/generatetoken",
      });
    } catch (err) {
      throw new MoonstrideAuthError({
        message: `Token generation failed: ${(err as Error).message}`,
        status: (err as { status?: number }).status ?? 0,
        body: (err as { body?: unknown }).body,
      });
    }

    const accessToken = data.response?.accessToken;
    if (!accessToken) {
      throw new MoonstrideAuthError({
        message: "Token generation succeeded but no accessToken was returned",
        status: 200,
        body: data,
      });
    }

    const expiresAtMs = this.computeExpiry(data.response?.accessTokenExpiresAt);
    this.cached = { accessToken, expiresAtMs };
    return accessToken;
  }

  private computeExpiry(expiresAt: string | undefined): number {
    if (expiresAt) {
      const parsed = Date.parse(expiresAt);
      if (!Number.isNaN(parsed)) return parsed - EXPIRY_SKEW_MS;
    }
    return this.now() + DEFAULT_TTL_MS - EXPIRY_SKEW_MS;
  }
}
