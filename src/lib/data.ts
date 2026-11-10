import "server-only";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { endOfWeekKey, toDayKey, todayKey } from "@/lib/dates";
import type { DayContext, MemberDTO, ProjectDTO, TaskDTO } from "@/lib/types";

export async function getDayContext(): Promise<DayContext> {
  await connection();
  const now = new Date();
  return { today: todayKey(now), weekEnd: endOfWeekKey(now) };
}

export async function getMembers(): Promise<MemberDTO[]> {
  await connection();
  const [viewer, members] = await Promise.all([
    getSessionUser(),
    prisma.member.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, access: true, passwordHash: true },
    }),
  ]);
  const isAdmin = viewer?.access === "ADMIN";
  // Never send the hash to the client; only whether one exists.
  // Emails are only sent to admins (members still see their own).
  return members.map(({ passwordHash, email, ...m }) => ({
    ...m,
    email: isAdmin || m.id === viewer?.id ? email : null,
    hasLogin: passwordHash !== null,
  }));
}

export async function getTasks(): Promise<TaskDTO[]> {
  await connection();
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { position: "asc" }, { taskNumber: "asc" }],
    include: {
      project: { select: { id: true, name: true, key: true } },
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
    projectId: t.projectId,
    project: t.project,
    assigneeId: t.assigneeId,
    assignee: t.assignee,
  }));
}

/** All projects, oldest first, with how many tasks each has. */
export async function getProjects(): Promise<ProjectDTO[]> {
  await connection();
  const [projects, counts] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, key: true, description: true },
    }),
    prisma.task.groupBy({ by: ["projectId", "status"], _count: { _all: true } }),
  ]);
  return projects.map((p) => {
    let taskCount = 0;
    let doneCount = 0;
    for (const c of counts) {
      if (c.projectId !== p.id) continue;
      taskCount += c._count._all;
      if (c.status === "DONE") doneCount += c._count._all;
    }
    return { ...p, taskCount, doneCount, openCount: taskCount - doneCount };
  });
}

/** True until the first account with a password exists. */
export async function needsSetup(): Promise<boolean> {
  await connection();
  return (await prisma.member.count({ where: { passwordHash: { not: null } } })) === 0;
}
