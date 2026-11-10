import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Equal, Flame } from "lucide-react";
import type { Priority } from "@prisma/client";
import { PRIORITY_LABEL, PRIORITY_STYLE } from "@/lib/constants";
import { formatDayKey, type DeadlineState } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PRIORITY_ICON = { LOW: ArrowDown, MEDIUM: Equal, HIGH: ArrowUp, URGENT: Flame };

export function PriorityBadge({ priority }: { priority: Priority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        PRIORITY_STYLE[priority],
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function DueBadge({
  dueDate,
  state,
  done,
}: {
  dueDate: string;
  state: DeadlineState;
  done?: boolean;
}) {
  const overdue = !done && state === "overdue";
  const today = !done && state === "today";
  const Icon = overdue ? AlertTriangle : CalendarDays;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        overdue && "bg-red-100 text-red-700",
        today && "bg-amber-100 text-amber-800",
        !overdue && !today && "bg-zinc-100 text-zinc-600",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {today ? "Today" : formatDayKey(dueDate)}
    </span>
  );
}
