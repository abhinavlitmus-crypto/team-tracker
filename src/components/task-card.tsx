import { deadlineState } from "@/lib/dates";
import type { DayContext, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, UnassignedAvatar } from "./avatar";
import { DueBadge, PriorityBadge } from "./badges";

export function TaskCard({
  task,
  day,
  dragging,
}: {
  task: TaskDTO;
  day: DayContext;
  dragging?: boolean;
}) {
  const done = task.status === "DONE";
  const state = deadlineState(task.dueDate, day.today, day.weekEnd);
  const overdue = !done && state === "overdue";

  return (
    <div
      className={cn(
        "group rounded-lg border bg-white p-3 text-left shadow-xs transition",
        overdue ? "border-red-200 border-l-4 border-l-red-500" : "border-zinc-200",
        dragging ? "rotate-1 shadow-lg ring-2 ring-indigo-500/30" : "hover:border-zinc-300 hover:shadow-sm",
      )}
    >
      <p className={cn("wrap-break-word text-sm font-medium leading-snug", done ? "text-zinc-400 line-through" : "text-zinc-900")}>
        {task.title}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && <DueBadge dueDate={task.dueDate} state={state} done={done} />}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono text-[11px] text-zinc-400">{task.key}</span>
        {task.assignee ? (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
        ) : (
          <UnassignedAvatar />
        )}
      </div>
    </div>
  );
}
