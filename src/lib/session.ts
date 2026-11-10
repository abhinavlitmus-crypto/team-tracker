/**
 * Stateless signed-session helpers. Uses Web Crypto (HMAC-SHA256) so the exact
 * same code runs in the Edge middleware and in Node server actions. No secret
 * ever reaches the client: this module is only imported by middleware and
 * server-side code.
 */

export const SESSION_COOKIE = "tt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short (needs at least 16 characters).");
  }
  return secret;
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time string comparison (equal-length inputs). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent, constant-time secret comparison (hashes both sides first). */
export async function compareSecret(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  return timingSafeEqual(ha, hb);
}

/** Issues a signed session token that expires after SESSION_TTL_SECONDS. */
export async function createSessionToken(): Promise<string> {
  const payload = base64url(
    encoder.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })),
  );
  const sig = base64url(await hmac(payload));
  return `${payload}.${sig}`;
}

/** Verifies signature and expiry. Returns false for any malformed/expired token. */
export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = base64url(await hmac(payload));
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    return typeof data.exp === "number" && data.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
