import type { Access, Priority, Role, TaskStatus } from "@prisma/client";

export type MemberDTO = {
  id: string;
  name: string;
  /** Only filled in for admins, and for the viewer's own entry. */
  email: string | null;
  role: Role;
  avatarColor: string;
  access: Access;
  /** True once the member has a password and can sign in. */
  hasLogin: boolean;
};

/** The signed-in member, as passed to client components. */
export type CurrentUser = {
  id: string;
  name: string;
  access: Access;
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
