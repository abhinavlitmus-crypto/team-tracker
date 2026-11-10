import type { Access, Priority, Role, TaskStatus } from "@prisma/client";

export const STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const PRIORITIES: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
export const ROLES: Role[] = ["FRONTEND", "BACKEND", "QA", "DESIGNER", "PM"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  BACKLOG: "bg-zinc-400",
  TODO: "bg-sky-500",
  IN_PROGRESS: "bg-violet-500",
  IN_REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200",
};

export const ROLE_LABEL: Record<Role, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  QA: "QA",
  DESIGNER: "Designer",
  PM: "PM",
};

export const ACCESS_LABEL: Record<Access, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const ACCESS_HINT: Record<Access, string> = {
  ADMIN: "Can create, assign and delete tasks, and manage the team.",
  MEMBER: "Can view the board and update the status of their own tasks.",
};

export const AVATAR_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];
