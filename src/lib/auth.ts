import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionToken, readSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { CurrentUser } from "@/lib/types";
import type { ActionState } from "@/lib/validation";

/**
 * The signed-in member, or null. Loads the member on every request so deleted
 * members, password resets and access changes take effect immediately.
 */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const member = await prisma.member.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, access: true, avatarColor: true, passwordHash: true, sessionVersion: true },
  });
  if (!member || !member.passwordHash || member.sessionVersion !== session.ver) return null;
  return { id: member.id, name: member.name, access: member.access, avatarColor: member.avatarColor };
});

/** For pages: the signed-in member, or a redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Sets the session cookie for a member. */
export async function startSession(memberId: string, version: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(memberId, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
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

const DENIED_ADMIN: ActionState = {
  ok: false,
  message: "Only admins can do that.",
};

type GuardResult = { user: CurrentUser; denied: null } | { user: null; denied: ActionState };

/**
 * Gate for mutating server actions: requires a signed-in member (an admin when
 * `admin` is set) and applies a per-member, per-action rate limit.
 */
export async function guard(action: string, opts: { admin?: boolean } = {}): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { user: null, denied: DENIED_AUTH };
  if (opts.admin && user.access !== "ADMIN") return { user: null, denied: DENIED_ADMIN };
  if (!rateLimit(`${user.id}:${action}`, 60, 60_000)) return { user: null, denied: DENIED_RATE };
  return { user, denied: null };
}

/** Rate-limit key for the unauthenticated login endpoint (stricter). */
export async function loginRateKey(): Promise<string> {
  return `${await clientKey()}:login`;
}
