"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard, loginRateKey, startSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { compareSecret, SESSION_COOKIE } from "@/lib/session";
import {
  changePasswordSchema,
  flattenErrors,
  loginSchema,
  setupSchema,
  type ActionState,
} from "@/lib/validation";

const TOO_MANY: ActionState = {
  ok: false,
  message: "Too many attempts. Please wait a minute and try again.",
};

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Throttle guesses hard: 10 attempts per minute per client.
  if (!rateLimit(await loginRateKey(), 10, 60_000)) return TOO_MANY;

  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const { email, password } = parsed.data;

  const member = await prisma.member.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, sessionVersion: true },
  });
  // Always run one hash check so unknown emails can't be told apart by timing.
  const ok = await verifyPassword(password, member?.passwordHash ?? null);
  if (!member || !ok) return { ok: false, message: "Incorrect email or password." };

  await startSession(member.id, member.sessionVersion);
  redirect("/");
}

/**
 * Creates the first admin account. Only works while no account has a password,
 * and needs AUTH_PASSWORD as a setup key so a stranger can't claim a fresh install.
 */
export async function setupAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!rateLimit(await loginRateKey(), 10, 60_000)) return TOO_MANY;

  const setupKey = process.env.AUTH_PASSWORD;
  if (!setupKey) {
    return { ok: false, message: "Setup is disabled. Set AUTH_PASSWORD in .env to use it as the setup key." };
  }

  const parsed = setupSchema.safeParse({
    setupKey: formData.get("setupKey") ?? "",
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const { name, email, password } = parsed.data;

  if (!(await compareSecret(parsed.data.setupKey, setupKey))) {
    return { ok: false, errors: { setupKey: "Incorrect setup key." } };
  }

  const passwordHash = await hashPassword(password);
  let admin: { id: string; sessionVersion: number };
  try {
    admin = await prisma.$transaction(
      async (tx) => {
        const accounts = await tx.member.count({ where: { passwordHash: { not: null } } });
        if (accounts > 0) throw new SetupClosed();
        // Reuse an existing team member with this email, or add a new one.
        return tx.member.upsert({
          where: { email },
          update: { passwordHash, access: "ADMIN", sessionVersion: { increment: 1 } },
          create: { name, email, role: "PM", access: "ADMIN", passwordHash },
          select: { id: true, sessionVersion: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof SetupClosed) {
      return { ok: false, message: "An admin account already exists. Reload the page to sign in." };
    }
    console.error(err);
    return { ok: false, message: "Could not create the account. Please try again." };
  }

  await startSession(admin.id, admin.sessionVersion);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, denied } = await guard("changePassword");
  if (denied) return denied;

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current") ?? "",
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  const member = await prisma.member.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(parsed.data.current, member?.passwordHash ?? null))) {
    return { ok: false, errors: { current: "That's not your current password." } };
  }

  // Bumping the version signs out every other device; this one gets a fresh cookie.
  const updated = await prisma.member.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await startSession(user.id, updated.sessionVersion);
  return { ok: true, message: "Password updated." };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

class SetupClosed extends Error {}
