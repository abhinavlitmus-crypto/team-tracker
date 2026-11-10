import { addDays, endOfWeek, format, parseISO } from "date-fns";

/**
 * Due dates are calendar days. They are stored as UTC midnight of the chosen
 * day and compared as "yyyy-MM-dd" strings, so time zones never shift a deadline.
 */
export function toDayKey(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Today's calendar day in the server's local time zone. */
export function todayKey(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function endOfWeekKey(now = new Date()): string {
  return format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function shiftDayKey(key: string, days: number): string {
  return format(addDays(parseISO(key), days), "yyyy-MM-dd");
}

export function formatDayKey(key: string, pattern = "MMM d"): string {
  return format(parseISO(key), pattern);
}

export type DeadlineState = "overdue" | "today" | "week" | "upcoming" | "none";

export function deadlineState(
  dueKey: string | null,
  today: string,
  weekEnd: string,
): DeadlineState {
  if (!dueKey) return "none";
  if (dueKey < today) return "overdue";
  if (dueKey === today) return "today";
  if (dueKey <= weekEnd) return "week";
  return "upcoming";
}
