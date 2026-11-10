"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard, startSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { flattenErrors, memberSchema, type ActionState } from "@/lib/validation";

function parseMember(formData: FormData) {
  return memberSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    access: formData.get("access") ?? "MEMBER",
    avatarColor: formData.get("avatarColor") ?? "",
    password: formData.get("password") ?? "",
  });
}

function isDuplicateEmail(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const DUPLICATE: ActionState = { ok: false, errors: { email: "A member with this email already exists." } };

/** Adds a member with a starting password so they can sign in right away. */
export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { denied } = await guard("createMember", { admin: true });
  if (denied) return denied;

  const parsed = parseMember(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const { password, ...data } = parsed.data;
  if (!password) return { ok: false, errors: { password: "Set a starting password" } };

  try {
    await prisma.member.create({ data: { ...data, passwordHash: await hashPassword(password) } });
  } catch (err) {
    if (isDuplicateEmail(err)) return DUPLICATE;
    console.error(err);
    return { ok: false, message: "Could not add the member. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Edits a member's details and access. A new password signs out their sessions. */
export async function updateMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, denied } = await guard("updateMember", { admin: true });
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  const parsed = parseMember(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const { password, ...data } = parsed.data;

  // Admins can't demote themselves, so there is always at least one admin.
  if (id === user.id && data.access !== "ADMIN") {
    return { ok: false, errors: { access: "You can't remove your own admin access." } };
  }

  let version: number;
  try {
    const updated = await prisma.member.update({
      where: { id },
      data: {
        ...data,
        ...(password && { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } }),
      },
      select: { sessionVersion: true },
    });
    version = updated.sessionVersion;
  } catch (err) {
    if (isDuplicateEmail(err)) return DUPLICATE;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, message: "This member was removed." };
    }
    console.error(err);
    return { ok: false, message: "Could not save the member. Please try again." };
  }

  // Keep the admin signed in if they reset their own password here.
  if (password && id === user.id) await startSession(user.id, version);

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Deletes a member. Their tasks stay on the board as unassigned. */
export async function deleteMember(id: string): Promise<ActionState> {
  const { user, denied } = await guard("deleteMember", { admin: true });
  if (denied) return denied;
  if (id === user.id) return { ok: false, message: "You can't remove yourself." };

  try {
    // deleteMany doesn't throw when someone else already removed the member.
    await prisma.member.deleteMany({ where: { id } });
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Could not delete the member." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
