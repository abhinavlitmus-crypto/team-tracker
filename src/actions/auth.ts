"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginRateKey } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  compareSecret,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/session";
import type { ActionState } from "@/lib/validation";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Throttle guesses hard: 10 attempts per minute per client.
  if (!rateLimit(await loginRateKey(), 10, 60_000)) {
    return { ok: false, message: "Too many attempts. Please wait a minute and try again." };
  }

  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    return { ok: false, message: "Authentication is not configured. Set AUTH_PASSWORD." };
  }

  const password = String(formData.get("password") ?? "");
  if (!password || !(await compareSecret(password, expected))) {
    return { ok: false, message: "Incorrect password." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
