import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, authSecret, verifySession } from "@/lib/auth";

/** Paths that never require dashboard auth (login + the embeddable widget). */
const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/widget",
  "/embed.js",
];

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // The embeddable widget calls /api/chat with a widget key instead of a session.
  if (pathname === "/api/chat") {
    const widgetKey = process.env.WIDGET_KEY;
    const provided = req.headers.get("x-widget-key");
    if (widgetKey && provided && provided === widgetKey) {
      return NextResponse.next();
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, authSecret());
  if (session) return NextResponse.next();

  // API routes get a 401; page routes redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
