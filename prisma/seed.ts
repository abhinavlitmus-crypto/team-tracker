import { PrismaClient, type Priority, type TaskStatus } from "@prisma/client";
import { addDays, format } from "date-fns";

const prisma = new PrismaClient();

/** A calendar day relative to today, stored as UTC midnight (see src/lib/dates.ts). */
function day(offset: number) {
  return new Date(`${format(addDays(new Date(), offset), "yyyy-MM-dd")}T00:00:00.000Z`);
}

async function main() {
  // Wipe existing data and restart task numbering at CORE-1.
  await prisma.$executeRawUnsafe('TRUNCATE "Task", "Member", "Project" RESTART IDENTITY CASCADE');

  const project = await prisma.project.create({
    data: {
      name: "Core Platform",
      key: "CORE",
      description: "Main product platform: web app, API and release tooling.",
    },
  });

  const [maya, dev, sam, priya] = await Promise.all([
    prisma.member.create({
      data: { name: "Maya Chen", email: "maya@example.com", role: "FRONTEND", avatarColor: "#6366f1" },
    }),
    prisma.member.create({
      data: { name: "Dev Patel", email: "dev@example.com", role: "BACKEND", avatarColor: "#10b981" },
    }),
    prisma.member.create({
      data: { name: "Sam Rivera", email: "sam@example.com", role: "QA", avatarColor: "#f59e0b" },
    }),
    prisma.member.create({
      data: { name: "Priya Nair", email: "priya@example.com", role: "PM", avatarColor: "#ec4899" },
    }),
  ]);

  const tasks: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    due: number;
    assigneeId: string | null;
  }[] = [
    // Overdue
    {
      title: "Fix login redirect loop on expired sessions",
      description: "Users with an expired refresh token bounce between /login and /app. Clear the stale cookie and redirect once.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      due: -3,
      assigneeId: dev.id,
    },
    {
      title: "Regression test plan for checkout v2",
      description: "Cover coupon codes, saved cards and guest checkout across Chrome, Safari and Firefox.",
      status: "TODO",
      priority: "HIGH",
      due: -1,
      assigneeId: sam.id,
    },
    // Due today
    {
      title: "Ship responsive navigation bar",
      description: "Collapse to a drawer below 768px. Keep keyboard focus order intact.",
      status: "IN_REVIEW",
      priority: "HIGH",
      due: 0,
      assigneeId: maya.id,
    },
    {
      title: "Write Q4 release notes",
      description: "Summarise shipped features and known issues for the customer newsletter.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      due: 0,
      assigneeId: priya.id,
    },
    // Upcoming
    {
      title: "Add rate limiting to public API",
      description: "Token bucket per API key, 100 req/min default, return 429 with Retry-After.",
      status: "TODO",
      priority: "HIGH",
      due: 2,
      assigneeId: dev.id,
    },
    {
      title: "Dark mode color tokens",
      description: "Define semantic tokens for surfaces, borders and text; audit contrast ratios.",
      status: "BACKLOG",
      priority: "LOW",
      due: 9,
      assigneeId: maya.id,
    },
    {
      title: "Automate smoke tests in CI",
      description: "Run the critical-path Playwright suite on every merge to main.",
      status: "BACKLOG",
      priority: "MEDIUM",
      due: 14,
      assigneeId: null,
    },
    {
      title: "Set up error monitoring dashboards",
      description: "Group errors by release and alert on new error types.",
      status: "DONE",
      priority: "MEDIUM",
      due: 5,
      assigneeId: dev.id,
    },
  ];

  const positions: Partial<Record<TaskStatus, number>> = {};
  for (const t of tasks) {
    const position = positions[t.status] ?? 0;
    positions[t.status] = position + 1;
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        position,
        dueDate: day(t.due),
        completedAt: t.status === "DONE" ? new Date() : null,
        assigneeId: t.assigneeId,
        projectId: project.id,
      },
    });
  }

  console.log(`Seeded project ${project.key}, 4 members and ${tasks.length} tasks.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
