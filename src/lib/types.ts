import type { Priority, Role, TaskStatus } from "@prisma/client";

export type MemberDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
};

export type TaskDTO = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  /** Calendar day, "yyyy-MM-dd". */
  dueDate: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  assignee: Pick<MemberDTO, "id" | "name" | "avatarColor"> | null;
};

/** Server-computed calendar context so client and server agree on "today". */
export type DayContext = { today: string; weekEnd: string };
