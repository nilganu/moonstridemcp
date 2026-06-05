/**
 * Minimal HMAC-signed session tokens, usable in both the Edge middleware and
 * Node route handlers (uses the Web Crypto API available in both runtimes).
 *
 * Token format: base64url(JSON payload).base64url(HMAC-SHA256)
 */

export const SESSION_COOKIE = "ms_session";
const DEFAULT_TTL_SEC = 60 * 60 * 12; // 12h

export interface SessionPayload {
  sub: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const encoder = new TextEncoder();

/** Copy into a standalone ArrayBuffer (satisfies BufferSource across TS lib versions). */
function buf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    buf(encoder.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Create a signed session token for `subject`, valid for `ttlSec`. */
export async function createSession(
  subject: string,
  secret: string,
  ttlSec = DEFAULT_TTL_SEC,
): Promise<string> {
  const payload: SessionPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, buf(encoder.encode(body))),
  );
  return `${body}.${b64urlEncode(sig)}`;
}

/** Verify a token. Returns the payload if valid and unexpired, else null. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      buf(b64urlDecode(sig)),
      buf(encoder.encode(body)),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Whether auth is enforced. Auth turns on as soon as a password is configured,
 * so a fresh dev setup is open but any real deployment with a password is locked.
 */
export function authEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

/** Signing secret — falls back to the password if no dedicated secret is set. */
export function authSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.DASHBOARD_PASSWORD ?? "insecure-dev-secret";
}
