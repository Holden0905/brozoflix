import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  type SessionRole,
} from "@/lib/session";

const enc = new TextEncoder();

// Hash both sides so the comparison is fixed-length and constant-time.
async function passphraseMatches(input: string, actual: string) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(actual)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const passphrase = typeof body?.passphrase === "string" ? body.passphrase : "";

  // Admin first: if both env vars hold the same value, admin wins.
  let role: SessionRole | null = null;
  const adminPass = process.env.ADMIN_PASSPHRASE;
  const memberPass = process.env.APP_PASSPHRASE;
  if (adminPass && (await passphraseMatches(passphrase, adminPass))) {
    role = "admin";
  } else if (memberPass && (await passphraseMatches(passphrase, memberPass))) {
    role = "member";
  }
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "That passphrase didn't match." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(process.env.COOKIE_SECRET!, role);
  const res = NextResponse.json({ ok: true });
  // Secure when actually served over https (Tailscale Funnel sets
  // x-forwarded-proto); plain http on the LAN still gets a working cookie.
  const proto =
    req.headers.get("x-forwarded-proto") ??
    new URL(req.url).protocol.replace(":", "");
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
