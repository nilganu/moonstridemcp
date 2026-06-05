import { NextResponse } from "next/server";
import { SESSION_COOKIE, authSecret, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Validate username/password against env and set a signed session cookie. */
export async function POST(request: Request): Promise<Response> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    // Auth disabled — nothing to log into.
    return NextResponse.json({ ok: true, authDisabled: true });
  }

  const { username, password: pw } = (await request
    .json()
    .catch(() => ({}))) as { username?: string; password?: string };

  const expectedUser = process.env.DASHBOARD_USERNAME ?? "admin";
  if (username !== expectedUser || pw !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession(expectedUser, authSecret());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
