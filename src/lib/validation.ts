import { z } from "zod";

/** True for a real calendar day in "yyyy-MM-dd" form (rejects 2026-02-31, 2026-13-01). */
function isDayKey(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const year = Number(v.slice(0, 4));
  if (year < 1900 || year > 9999) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const optionalText = z
  .string()
  .trim()
  .max(5000, "Keep it under 5000 characters")
  .transform((v) => (v === "" ? null : v));

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: optionalText,
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  dueDate: z
    .string()
    .trim()
    .refine((v) => v === "" || isDayKey(v), "Use a valid date")
    .transform((v) => (v === "" ? null : v)),
});

const STATUS = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
const name = z.string().trim().min(1, "Name is required").max(100, "Name is too long");

/** New passwords. The upper bound keeps hashing cheap for oversized input. */
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Keep it under 200 characters");

export const memberSchema = z.object({
  name,
  email,
  role: z.enum(["FRONTEND", "BACKEND", "QA", "DESIGNER", "PM"]),
  access: z.enum(["ADMIN", "MEMBER"]),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
  /** Required when adding a member; blank on edit keeps the current password. */
  password: z.union([z.literal(""), newPassword]),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const setupSchema = z
  .object({
    setupKey: z.string().min(1, "Enter the setup key"),
    name,
    email,
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password").max(200),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const statusSchema = z.object({ taskId: z.string().min(1), status: STATUS });

export const moveSchema = z.object({
  taskId: z.string().min(1),
  status: STATUS,
  /** The visible task the moved card now sits directly above, if any. */
  beforeTaskId: z.string().nullable(),
  /** The visible task the moved card now sits directly below, if any. */
  afterTaskId: z.string().nullable(),
});

export type FieldErrors = Partial<Record<string, string>>;

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
};

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
