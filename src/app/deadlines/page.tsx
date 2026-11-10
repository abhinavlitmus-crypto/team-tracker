import { Suspense } from "react";
import type { Metadata } from "next";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertOctagon, CalendarCheck, CalendarDays, CalendarRange, Clock } from "lucide-react";
import { Avatar, UnassignedAvatar } from "@/components/avatar";
import { PriorityBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { EditTaskTrigger } from "@/components/triggers";
import { PRIORITIES, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { getDayContext, getMembers, getTasks } from "@/lib/data";
import { deadlineState, formatDayKey } from "@/lib/dates";
import type { DayContext, MemberDTO, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Deadlines" };

export default function DeadlinesPage() {
  return (
    <>
      <PageHeader title="Deadlines" description="Open tasks grouped by when they are due." />
      <Suspense fallback={<ListSkeleton />}>
        <DeadlinesData />
      </Suspense>
    </>
  );
}

const GROUPS = [
  {
    id: "overdue",
    title: "Overdue",
    icon: AlertOctagon,
    section: "border-red-200 bg-red-50/60",
    heading: "text-red-700",
    count: "bg-red-600 text-white",
    empty: "Nothing overdue. Nice work.",
  },
  {
    id: "today",
    title: "Due Today",
    icon: Clock,
    section: "border-amber-200 bg-amber-50/60",
    heading: "text-amber-800",
    count: "bg-amber-500 text-white",
    empty: "Nothing due today.",
  },
  {
    id: "week",
    title: "Due This Week",
    icon: CalendarRange,
    section: "border-zinc-200 bg-white",
    heading: "text-zinc-800",
    count: "bg-zinc-200 text-zinc-700",
    empty: "Nothing else due this week.",
  },
  {
    id: "upcoming",
    title: "Upcoming",
    icon: CalendarDays,
    section: "border-zinc-200 bg-white",
    heading: "text-zinc-800",
    count: "bg-zinc-200 text-zinc-700",
    empty: "No upcoming deadlines.",
  },
] as const;

async function DeadlinesData() {
  const [tasks, members, day] = await Promise.all([getTasks(), getMembers(), getDayContext()]);
  const open = tasks.filter((t) => t.status !== "DONE");
  const withDue = open
    .filter((t): t is TaskDTO & { dueDate: string } => t.dueDate !== null)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
    );
  const noDueCount = open.length - withDue.length;

  const grouped = Object.fromEntries(GROUPS.map((g) => [g.id, [] as typeof withDue]));
  for (const t of withDue) grouped[deadlineState(t.dueDate, day.today, day.weekEnd)]?.push(t);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      {GROUPS.map((g) => {
        const items = grouped[g.id];
        const Icon = g.icon;
        return (
          <section key={g.id} className={cn("overflow-hidden rounded-xl border", g.section)}>
            <header className="flex items-center gap-2 px-4 py-3">
              <Icon className={cn("h-4 w-4", g.heading)} />
              <h2 className={cn("text-sm font-semibold", g.heading)}>{g.title}</h2>
              <span className={cn("rounded-full px-2 text-xs font-medium", g.count)}>{items.length}</span>
            </header>
            {items.length === 0 ? (
              <p className="border-t border-black/5 px-4 py-4 text-sm text-zinc-500">{g.empty}</p>
            ) : (
              <ul className="divide-y divide-black/5 border-t border-black/5">
                {items.map((t) => (
                  <li key={t.id}>
                    <DeadlineRow task={t} members={members} day={day} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {noDueCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          <CalendarCheck className="h-4 w-4" />
          {noDueCount} open {noDueCount === 1 ? "task has" : "tasks have"} no due date.
        </p>
      )}
    </div>
  );
}

function DeadlineRow({
  task,
  members,
  day,
}: {
  task: TaskDTO & { dueDate: string };
  members: MemberDTO[];
  day: DayContext;
}) {
  const diff = differenceInCalendarDays(parseISO(task.dueDate), parseISO(day.today));
  const relative =
    diff < 0
      ? `${-diff} day${diff === -1 ? "" : "s"} overdue`
      : diff === 0
        ? "Due today"
        : diff === 1
          ? "Tomorrow"
          : `In ${diff} days`;

  return (
    <EditTaskTrigger
      task={task}
      members={members}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-black/[0.03]"
    >
      <div className="w-20 shrink-0">
        <p className="text-sm font-semibold text-zinc-900">{formatDayKey(task.dueDate, "EEE, MMM d")}</p>
        <p className={cn("text-xs", diff < 0 ? "font-medium text-red-600" : diff === 0 ? "text-amber-700" : "text-zinc-500")}>
          {relative}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="font-mono">{task.key}</span>
          <span className="inline-flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[task.status])} />
            {STATUS_LABEL[task.status]}
          </span>
        </div>
      </div>
      <div className="hidden sm:block">
        <PriorityBadge priority={task.priority} />
      </div>
      {task.assignee ? (
        <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
      ) : (
        <UnassignedAvatar />
      )}
    </EditTaskTrigger>
  );
}

function ListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-200/60" />
      ))}
    </div>
  );
}
