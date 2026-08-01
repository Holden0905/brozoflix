// Signed-cookie helpers. Web Crypto only, so this runs in both the edge
// runtime (middleware) and the node runtime (route handlers).

export const SESSION_COOKIE = "brozoflix_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type SessionRole = "member" | "admin";

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Token shape: `<issued-at base36>.<role>.<hex hmac-sha256 of payload>`.
 * Pre-admin tokens (`<issued>.<sig>`) still verify and read as member, so
 * cookies minted before the admin feature keep working.
 */
export async function createSessionToken(
  secret: string,
  role: SessionRole = "member"
): Promise<string> {
  const payload = `${Date.now().toString(36)}.${role}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

/** Returns the token's role, or null when the token is missing or invalid. */
export async function getSessionRole(
  token: string | undefined,
  secret: string
): Promise<SessionRole | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = fromHex(token.slice(dot + 1));
  if (!sig || sig.length !== 32) return null;

  const key = await hmacKey(secret);
  // subtle.verify is constant-time; no manual comparison needed.
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sig as unknown as BufferSource,
    enc.encode(payload)
  );
  if (!valid) return null;

  const parts = payload.split(".");
  if (parts.length === 1) return "member"; // legacy pre-admin token
  if (parts.length === 2 && (parts[1] === "member" || parts[1] === "admin")) {
    return parts[1];
  }
  return null;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  return (await getSessionRole(token, secret)) !== null;
}
