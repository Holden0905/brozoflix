import { NextResponse } from "next/server";
import { NAME_COOKIE, nameCookieOptions, validateName } from "@/lib/identity";

/**
 * Set or change the display name. Changing it hands the device to someone
 * else rather than renaming a rater: existing ratings stay under the old
 * name, which is the honest reading of "not you?" on a shared iPad. A
 * capitalization-only change is the same identity, so the ratings route
 * rewrites that row's display name in place instead.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = validateName(body?.name);
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Name must be 1–40 characters." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, name });
  res.cookies.set(NAME_COOKIE, name, nameCookieOptions(req));
  return res;
}

/** Forget the name — back to being prompted on the next rating. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NAME_COOKIE, "", { ...nameCookieOptions(req), maxAge: 0 });
  return res;
}
