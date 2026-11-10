"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { flattenErrors, memberSchema, type ActionState } from "@/lib/validation";

export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard("createMember");
  if (denied) return denied;

  const parsed = memberSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    avatarColor: formData.get("avatarColor") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  try {
    await prisma.member.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, errors: { email: "A member with this email already exists." } };
    }
    console.error(err);
    return { ok: false, message: "Could not add the member. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Deletes a member. Their tasks stay on the board as unassigned. */
export async function deleteMember(id: string): Promise<ActionState> {
  const denied = await guard("deleteMember");
  if (denied) return denied;

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
