"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, Inbox } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { updateTaskStatus } from "@/actions/tasks";
import { STATUSES, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { deadlineState } from "@/lib/dates";
import type { CurrentUser, DayContext, MemberDTO, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DueBadge, PriorityBadge } from "./badges";
import { useDialog } from "./dialog";
import { inputClass } from "./modal";
import { TaskModal } from "./task-modal";

const OPEN_STATUSES = STATUSES.filter((s) => s !== "DONE");
const DONE_SHOWN = 10;

function byDueDate(a: TaskDTO, b: TaskDTO) {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export function MyTasks({
  viewer,
  tasks,
  members,
  day,
}: {
  viewer: CurrentUser;
  tasks: TaskDTO[];
  members: MemberDTO[];
  day: DayContext;
}) {
  const [optimistic, setStatus] = useOptimistic(
    tasks,
    (state, change: { id: string; status: TaskStatus }) =>
      state.map((t) => (t.id === change.id ? { ...t, status: change.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [opened, setOpened] = useState<TaskDTO | null>(null);
  const [showDone, setShowDone] = useState(false);
  const dialog = useDialog();

  function changeStatus(task: TaskDTO, status: TaskStatus) {
    startTransition(async () => {
      setStatus({ id: task.id, status });
      const res = await updateTaskStatus({ taskId: task.id, status });
      if (!res.ok) dialog.alert({ title: "Couldn't update status", message: res.message, tone: "error" });
    });
  }

  const open = optimistic.filter((t) => t.status !== "DONE");
  const done = optimistic
    .filter((t) => t.status === "DONE")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const states = open.map((t) => deadlineState(t.dueDate, day.today, day.weekEnd));
  const overdue = states.filter((s) => s === "overdue").length;
  const dueSoon = states.filter((s) => s === "today" || s === "week").length;

  if (optimistic.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <Inbox className="h-8 w-8 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-700">Nothing assigned to you</p>
        <p className="text-sm text-zinc-500">
          {viewer.access === "ADMIN"
            ? "Assign yourself a task from the board to see it here."
            : "When an admin assigns you a task, it shows up here."}
        </p>
      </div>
    );
  }

  const row = (t: TaskDTO) => (
    <TaskRow
      key={t.id}
      task={t}
      day={day}
      onOpen={() => setOpened(t)}
      onStatus={(s) => changeStatus(t, s)}
    />
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 bg-white text-center sm:grid-cols-4">
        <Stat label="Open" value={open.length} />
        <Stat label="Overdue" value={overdue} tone={overdue ? "alert" : undefined} />
        <Stat label="Due this week" value={dueSoon} tone={dueSoon ? "warn" : undefined} />
        <Stat label="Done" value={done.length} />
      </dl>

      {OPEN_STATUSES.map((status) => {
        const items = open.filter((t) => t.status === status).sort(byDueDate);
        if (items.length === 0) return null;
        return (
          <Section key={status} status={status} count={items.length}>
            {items.map(row)}
          </Section>
        );
      })}

      {open.length === 0 && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          All caught up. Every task assigned to you is done.
        </p>
      )}

      {done.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-zinc-50"
          >
            <span className={cn("h-2 w-2 rounded-full", STATUS_DOT.DONE)} />
            <h2 className="text-sm font-semibold text-zinc-800">Done</h2>
            <span className="rounded-full bg-zinc-200 px-2 text-xs font-medium text-zinc-700">{done.length}</span>
            <ChevronDown className={cn("ml-auto h-4 w-4 text-zinc-400 transition", showDone && "rotate-180")} />
          </button>
          {showDone && (
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
              {done.slice(0, DONE_SHOWN).map(row)}
              {done.length > DONE_SHOWN && (
                <li className="px-4 py-2.5 text-xs text-zinc-500">
                  Showing the {DONE_SHOWN} most recently finished.
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {opened && (
        <TaskModal
          key={opened.id}
          viewer={viewer}
          task={opened}
          members={members}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}

function Section({ status, count, children }: { status: TaskStatus; count: number; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center gap-2 px-4 py-3">
        <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
        <h2 className="text-sm font-semibold text-zinc-800">{STATUS_LABEL[status]}</h2>
        <span className="rounded-full bg-zinc-200 px-2 text-xs font-medium text-zinc-700">{count}</span>
      </header>
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100">{children}</ul>
    </section>
  );
}

function TaskRow({
  task,
  day,
  onOpen,
  onStatus,
}: {
  task: TaskDTO;
  day: DayContext;
  onOpen: () => void;
  onStatus: (status: TaskStatus) => void;
}) {
  const done = task.status === "DONE";
  const state = deadlineState(task.dueDate, day.today, day.weekEnd);
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5", !done && state === "overdue" && "bg-red-50/40")}>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-medium", done ? "text-zinc-400 line-through" : "text-zinc-900 hover:text-indigo-700")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-zinc-400">{task.key}</span>
          <PriorityBadge priority={task.priority} />
          {task.dueDate && <DueBadge dueDate={task.dueDate} state={state} done={done} />}
        </div>
      </button>
      <select
        value={task.status}
        onChange={(e) => onStatus(e.target.value as TaskStatus)}
        aria-label={`Status of ${task.key}`}
        className={cn(inputClass, "w-36 shrink-0")}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "alert" | "warn" }) {
  return (
    <div className="border-zinc-100 py-3 not-last:border-r">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd
        className={cn(
          "text-lg font-semibold",
          tone === "alert" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-zinc-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
