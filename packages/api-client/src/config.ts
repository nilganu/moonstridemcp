import { z } from "zod";

/**
 * Configuration for {@link MoonstrideClient}. All fields can be supplied
 * explicitly or resolved from environment variables via {@link configFromEnv}.
 */
export const MoonstrideConfigSchema = z.object({
  /** Base URL of the Moonstride API, e.g. https://demo.moonstride.com */
  baseUrl: z.string().url().default("https://demo.moonstride.com"),
  /** Sent as the `x-api-key` header during token generation. */
  apiKey: z.string().min(1, "MOONSTRIDE_API_KEY is required"),
  /** Sent as the `clientid` header during token generation. */
  clientId: z.string().min(1, "MOONSTRIDE_CLIENT_ID is required"),
  /** Sent in the token-generation request body. */
  secretKey: z.string().min(1, "MOONSTRIDE_SECRET_KEY is required"),
  /** Sent in the token-generation request body. */
  userId: z.string().min(1, "MOONSTRIDE_USER_ID is required"),
  /** Per-request timeout in milliseconds. */
  timeoutMs: z.number().int().positive().default(30_000),
  /** Number of automatic retries on 429/5xx responses. */
  maxRetries: z.number().int().min(0).default(2),
});

export type MoonstrideConfig = z.infer<typeof MoonstrideConfigSchema>;
export type MoonstrideConfigInput = z.input<typeof MoonstrideConfigSchema>;

/** A partial environment bag — defaults to `process.env` in Node. */
export type EnvLike = Record<string, string | undefined>;

/**
 * Build a validated config from environment variables.
 * @throws ZodError with a readable message if required vars are missing.
 */
export function configFromEnv(env: EnvLike = process.env): MoonstrideConfig {
  const raw: Partial<MoonstrideConfigInput> = {
    baseUrl: env.MOONSTRIDE_BASE_URL,
    apiKey: env.MOONSTRIDE_API_KEY,
    clientId: env.MOONSTRIDE_CLIENT_ID,
    secretKey: env.MOONSTRIDE_SECRET_KEY,
    userId: env.MOONSTRIDE_USER_ID,
    timeoutMs: env.MOONSTRIDE_TIMEOUT_MS
      ? Number(env.MOONSTRIDE_TIMEOUT_MS)
      : undefined,
  };
  // Drop undefined keys so schema defaults apply.
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  );
  return MoonstrideConfigSchema.parse(cleaned);
}

/** Resolve a config from a partial input, applying schema defaults. */
export function resolveConfig(input: MoonstrideConfigInput): MoonstrideConfig {
  return MoonstrideConfigSchema.parse(input);
}
