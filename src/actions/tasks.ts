"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { DEFAULT_PROJECT } from "@/lib/data";
import { dayKeyToDate } from "@/lib/dates";
import {
  flattenErrors,
  moveSchema,
  taskSchema,
  type ActionState,
} from "@/lib/validation";

function refreshAll() {
  revalidatePath("/", "layout");
}

async function ensureProjectId(tx: Prisma.TransactionClient) {
  const existing = await tx.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing.id;
  const created = await tx.project.create({ data: DEFAULT_PROJECT });
  return created.id;
}

async function nextPosition(tx: Prisma.TransactionClient, status: TaskStatus) {
  const last = await tx.task.aggregate({ where: { status }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

export async function saveTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard("saveTask");
  if (denied) return denied;

  const parsed = taskSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const { title, description, status, priority, assigneeId, dueDate } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (assigneeId) {
        const member = await tx.member.findUnique({ where: { id: assigneeId } });
        if (!member) throw new UserError("That team member no longer exists.");
      }

      const base = {
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate: dueDate ? dayKeyToDate(dueDate) : null,
      };

      if (!id) {
        await tx.task.create({
          data: {
            ...base,
            projectId: await ensureProjectId(tx),
            position: await nextPosition(tx, status),
            completedAt: status === "DONE" ? new Date() : null,
          },
        });
        return;
      }

      const current = await tx.task.findUnique({ where: { id } });
      if (!current) throw new UserError("This task was deleted.");
      const statusChanged = current.status !== status;

      await tx.task.update({
        where: { id },
        data: {
          ...base,
          ...(statusChanged && {
            position: await nextPosition(tx, status),
            completedAt: status === "DONE" ? new Date() : null,
          }),
        },
      });
    });
  } catch (err) {
    if (err instanceof UserError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Could not save the task. Please try again." };
  }

  refreshAll();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionState> {
  const denied = await guard("deleteTask");
  if (denied) return denied;

  try {
    // deleteMany doesn't throw when someone else already deleted the task.
    await prisma.task.deleteMany({ where: { id } });
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Could not delete the task." };
  }
  refreshAll();
  return { ok: true };
}

/**
 * Moves a card on the board. The client sends the visible neighbours around the
 * drop point (filters may hide some cards), and the server places the card
 * relative to them in the full column, then renumbers that column.
 */
export async function moveTask(input: unknown): Promise<ActionState> {
  const denied = await guard("moveTask");
  if (denied) return denied;

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid move." };
  const { taskId, status, beforeTaskId, afterTaskId } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) throw new UserError("This task was deleted.");

      const column = await tx.task.findMany({
        where: { status, NOT: { id: taskId } },
        orderBy: [{ position: "asc" }, { taskNumber: "asc" }],
        select: { id: true },
      });
      const ids = column.map((t) => t.id);

      let index = ids.length;
      const beforeIdx = beforeTaskId ? ids.indexOf(beforeTaskId) : -1;
      const afterIdx = afterTaskId ? ids.indexOf(afterTaskId) : -1;
      if (beforeIdx !== -1) index = beforeIdx;
      else if (afterIdx !== -1) index = afterIdx + 1;
      ids.splice(index, 0, taskId);

      const enteringDone = status === "DONE" && task.status !== "DONE";
      const leavingDone = status !== "DONE" && task.status === "DONE";

      await tx.task.update({
        where: { id: taskId },
        data: {
          status,
          ...(enteringDone && { completedAt: new Date() }),
          ...(leavingDone && { completedAt: null }),
        },
      });

      await Promise.all(
        ids.map((id, position) => tx.task.update({ where: { id }, data: { position } })),
      );
    });
  } catch (err) {
    // Refresh either way so the board drops cards that no longer exist.
    refreshAll();
    if (err instanceof UserError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Could not move the task." };
  }

  refreshAll();
  return { ok: true };
}

class UserError extends Error {}
