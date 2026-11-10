import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfWeekKey, toDayKey, todayKey } from "@/lib/dates";
import type { DayContext, MemberDTO, TaskDTO } from "@/lib/types";

export const DEFAULT_PROJECT = {
  key: "CORE",
  name: "Core Platform",
  description: "Main product platform work.",
};

export async function getDayContext(): Promise<DayContext> {
  await connection();
  const now = new Date();
  return { today: todayKey(now), weekEnd: endOfWeekKey(now) };
}

export async function getMembers(): Promise<MemberDTO[]> {
  await connection();
  return prisma.member.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, avatarColor: true },
  });
}

export async function getTasks(): Promise<TaskDTO[]> {
  await connection();
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { position: "asc" }, { taskNumber: "asc" }],
    include: {
      project: { select: { key: true } },
      assignee: { select: { id: true, name: true, avatarColor: true } },
    },
  });
  return tasks.map((t) => ({
    id: t.id,
    key: `${t.project.key}-${t.taskNumber}`,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    position: t.position,
    dueDate: toDayKey(t.dueDate),
    completedAt: t.completedAt?.toISOString() ?? null,
    assigneeId: t.assigneeId,
    assignee: t.assignee,
  }));
}

export async function getDefaultProject() {
  await connection();
  return prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
}
