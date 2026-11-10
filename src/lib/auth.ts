import "server-only";
import { cookies, headers } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

/** True when the current request carries a valid, unexpired session cookie. */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Best-effort client identifier for rate limiting (behind a trusted proxy). */
async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const DENIED_AUTH: ActionState = {
  ok: false,
  message: "Your session has expired. Please reload the page and sign in again.",
};

const DENIED_RATE: ActionState = {
  ok: false,
  message: "Too many requests. Please slow down and try again shortly.",
};

/**
 * Gate for mutating server actions: requires a valid session and applies a
 * per-client, per-action rate limit. Returns an error ActionState to return
 * directly, or null when the call is allowed to proceed.
 */
export async function guard(action: string): Promise<ActionState | null> {
  if (!(await hasSession())) return DENIED_AUTH;
  const key = `${await clientKey()}:${action}`;
  if (!rateLimit(key, 60, 60_000)) return DENIED_RATE;
  return null;
}

/** Rate-limit key for the unauthenticated login endpoint (stricter). */
export async function loginRateKey(): Promise<string> {
  return `${await clientKey()}:login`;
}
