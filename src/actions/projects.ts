"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { flattenErrors, projectSchema, type ActionState } from "@/lib/validation";

function parseProject(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name") ?? "",
    key: formData.get("key") ?? "",
    description: formData.get("description") ?? "",
  });
}

function isPrismaError(err: unknown, code: string) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

const DUPLICATE_KEY: ActionState = { ok: false, errors: { key: "Another project already uses this key." } };

/** Adds a project that tasks can be filed under. Admins only. */
export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { denied } = await guard("createProject", { admin: true });
  if (denied) return denied;

  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  try {
    await prisma.project.create({ data: parsed.data });
  } catch (err) {
    if (isPrismaError(err, "P2002")) return DUPLICATE_KEY;
    console.error(err);
    return { ok: false, message: "Could not create the project. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Edits a project. Changing the key renames its task IDs (WEB-12 becomes APP-12). */
export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { denied } = await guard("updateProject", { admin: true });
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  const parsed = parseProject(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  try {
    await prisma.project.update({ where: { id }, data: parsed.data });
  } catch (err) {
    if (isPrismaError(err, "P2002")) return DUPLICATE_KEY;
    if (isPrismaError(err, "P2025")) return { ok: false, message: "This project was deleted." };
    console.error(err);
    return { ok: false, message: "Could not save the project. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Deletes an empty project. Projects with tasks are refused, because the
 * database would delete their tasks along with them.
 */
export async function deleteProject(id: string): Promise<ActionState> {
  const { denied } = await guard("deleteProject", { admin: true });
  if (denied) return denied;

  try {
    // The "no tasks" check is part of the delete itself, so a task added at the
    // same moment can't be removed with the project. deleteMany also doesn't
    // throw when someone else already deleted it.
    const { count } = await prisma.project.deleteMany({ where: { id, tasks: { none: {} } } });
    if (count === 0) {
      const tasks = await prisma.task.count({ where: { projectId: id } });
      if (tasks > 0) {
        return {
          ok: false,
          message: `This project still has ${tasks} task${tasks === 1 ? "" : "s"}. Move or delete them first.`,
        };
      }
    }
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Could not delete the project." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
