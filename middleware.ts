import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths reachable without the passphrase cookie. /sw.js and /favicon.ico are
// exempt beyond the spec list because PWA install and browser icon fetches
// don't carry user intent and must not bounce to /unlock.
const EXEMPT_PREFIXES = ["/_next/", "/icons/", "/api/unlock"];
const EXEMPT_EXACT = [
  "/unlock",
  "/manifest.json",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico",
];

function isExempt(pathname: string): boolean {
  return (
    EXEMPT_EXACT.includes(pathname) ||
    EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isExempt(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token, process.env.COOKIE_SECRET!)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/|icons/|unlock$|api/unlock|manifest\\.webmanifest$|manifest\\.json$|sw\\.js$|favicon\\.ico$).*)",
  ],
};
