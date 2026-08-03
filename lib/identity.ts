/**
 * Honor-system identity: a display name in a cookie, no accounts. Readable by
 * server components (so pages can mark "this rating is yours") which is why
 * it's a cookie rather than localStorage.
 *
 * httpOnly on purpose — the name reaches the client as a prop from the server
 * render, so there's exactly one source of truth and no client/server drift.
 */

export const NAME_COOKIE = "brozoflix_name";
export const NAME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, same as the session

export const NAME_MIN_LEN = 1;
export const NAME_MAX_LEN = 40;

/**
 * Storage form: whitespace-trimmed, capitalization preserved as typed.
 * Always trim before writing — Postgres `trim()` in the unique index only
 * strips spaces, so a stored "Brian\t" would key differently than JS expects.
 */
export function displayName(raw: string): string {
  return raw.trim();
}

/**
 * Identity form: what the `lower(trim(rated_by))` unique index collapses to.
 * "Brian", "brian" and "Brian " are all one rater.
 */
export function identityKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function sameIdentity(a: string, b: string): boolean {
  return identityKey(a) === identityKey(b);
}

/**
 * Returns the trimmed name, or null when it isn't usable. Control characters
 * are rejected so a name can't smuggle newlines into a Set-Cookie header.
 */
export function validateName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = displayName(raw);
  if (name.length < NAME_MIN_LEN || name.length > NAME_MAX_LEN) return null;
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

/**
 * Reads the name straight off the raw Cookie header, for route handlers.
 * Next serializes cookie values percent-encoded, so decode on the way back;
 * a malformed value just reads as absent rather than throwing.
 */
export function readNameCookie(req: Request): string | null {
  const raw = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${NAME_COOKIE}=`))
    ?.slice(NAME_COOKIE.length + 1);
  if (!raw) return null;
  try {
    return validateName(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * Secure only when actually served over https — Tailscale Funnel sets
 * x-forwarded-proto, while plain http on the LAN still needs a working cookie.
 */
export function nameCookieOptions(req: Request) {
  const proto =
    req.headers.get("x-forwarded-proto") ??
    new URL(req.url).protocol.replace(":", "");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: proto === "https",
    path: "/",
    maxAge: NAME_MAX_AGE,
  };
}
