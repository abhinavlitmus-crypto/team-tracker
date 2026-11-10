import { Suspense } from "react";
import type { Metadata } from "next";
import { AlertTriangle, KeyRound, Mail, ShieldCheck, UserX } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { DueBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { AddMemberButton, DeleteMemberButton, EditMemberButton, EditTaskTrigger } from "@/components/triggers";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { getDayContext, getMembers, getProjects, getTasks } from "@/lib/data";
import { deadlineState } from "@/lib/dates";
import type { CurrentUser, DayContext, MemberDTO, ProjectDTO, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Who is working on what, and who needs help."
        actions={
          <Suspense fallback={null}>
            <AdminActions />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <TeamData />
      </Suspense>
    </>
  );
}

async function AdminActions() {
  const viewer = await requireUser();
  return viewer.access === "ADMIN" ? <AddMemberButton /> : null;
}

function byDueDate(a: TaskDTO, b: TaskDTO) {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

async function TeamData() {
  const [viewer, tasks, members, projects, day] = await Promise.all([
    requireUser(),
    getTasks(),
    getMembers(),
    getProjects(),
    getDayContext(),
  ]);
  const isOverdue = (t: TaskDTO) =>
    t.status !== "DONE" && deadlineState(t.dueDate, day.today, day.weekEnd) === "overdue";

  const unassigned = tasks.filter((t) => !t.assigneeId && t.status !== "DONE");

  if (members.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <UserX className="h-8 w-8 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-700">No team members yet</p>
        <p className="text-sm text-zinc-500">
          {viewer.access === "ADMIN" ? "Add your first member to start assigning tasks." : "Ask an admin to add the team."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {members.map((m) => {
          const mine = tasks.filter((t) => t.assigneeId === m.id);
          const active = mine.filter((t) => t.status !== "DONE").sort(byDueDate);
          const overdue = active.filter(isOverdue);
          const done = mine.length - active.length;
          return (
            <MemberCard
              key={m.id}
              viewer={viewer}
              member={m}
              members={members}
              projects={projects}
              active={active}
              overdueCount={overdue.length}
              doneCount={done}
              day={day}
            />
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <p className="text-sm text-zinc-500">
          {unassigned.length} open {unassigned.length === 1 ? "task is" : "tasks are"} unassigned.
        </p>
      )}
    </div>
  );
}

function MemberCard({
  viewer,
  member,
  members,
  projects,
  active,
  overdueCount,
  doneCount,
  day,
}: {
  viewer: CurrentUser;
  member: MemberDTO;
  members: MemberDTO[];
  projects: ProjectDTO[];
  active: TaskDTO[];
  overdueCount: number;
  doneCount: number;
  day: DayContext;
}) {
  const isAdmin = viewer.access === "ADMIN";
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border bg-white shadow-xs",
        overdueCount ? "border-red-200" : "border-zinc-200",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar name={member.name} color={member.avatarColor} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-zinc-900">{member.name}</h2>
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
              {ROLE_LABEL[member.role]}
            </span>
            {member.access === "ADMIN" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
            {isAdmin && !member.hasLogin && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                title="Set a password so they can sign in"
              >
                <KeyRound className="h-3 w-3" /> No login
              </span>
            )}
          </div>
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-zinc-500 hover:text-indigo-600"
            >
              <Mail className="h-3 w-3" /> {member.email}
            </a>
          )}
        </div>
        {isAdmin && (
          <div className="flex">
            <EditMemberButton member={member} isSelf={member.id === viewer.id} />
            {member.id !== viewer.id && (
              <DeleteMemberButton member={member} taskCount={active.length + doneCount} />
            )}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-3 border-y border-zinc-100 text-center">
        <Stat label="Active" value={active.length} />
        <Stat label="Overdue" value={overdueCount} alert={overdueCount > 0} />
        <Stat label="Done" value={doneCount} />
      </dl>

      {overdueCount > 0 && (
        <p className="flex items-center gap-1.5 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {overdueCount} overdue {overdueCount === 1 ? "task needs" : "tasks need"} attention
        </p>
      )}

      <ul className="flex-1 divide-y divide-zinc-100">
        {active.length === 0 && <li className="px-4 py-4 text-sm text-zinc-400">No active tasks.</li>}
        {active.map((t) => {
          const state = deadlineState(t.dueDate, day.today, day.weekEnd);
          return (
            <li key={t.id}>
              <EditTaskTrigger
                viewer={viewer}
                task={t}
                members={members}
                projects={projects}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-zinc-50",
                  state === "overdue" && "bg-red-50/40",
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[t.status])} title={STATUS_LABEL[t.status]} />
                <span className="font-mono text-[11px] text-zinc-400">{t.key}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{t.title}</span>
                {t.dueDate && <DueBadge dueDate={t.dueDate} state={state} />}
              </EditTaskTrigger>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={cn("text-lg font-semibold", alert ? "text-red-600" : "text-zinc-900")}>{value}</dd>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-56 animate-pulse rounded-xl bg-zinc-200/60" />
      ))}
    </div>
  );
}
