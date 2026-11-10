"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { deleteMember } from "@/actions/members";
import type { MemberDTO, TaskDTO } from "@/lib/types";
import { useDialog } from "./dialog";
import { MemberModal } from "./member-modal";
import { buttonClass } from "./modal";
import { TaskModal } from "./task-modal";

/** Makes any task row clickable to open the edit modal. */
export function EditTaskTrigger({
  task,
  members,
  children,
  className,
}: {
  task: TaskDTO;
  members: MemberDTO[];
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <TaskModal task={task} members={members} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddMemberButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        <UserPlus className="h-4 w-4" /> Add member
      </button>
      {open && <MemberModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function DeleteMemberButton({ member, taskCount }: { member: MemberDTO; taskCount: number }) {
  const [pending, startTransition] = useTransition();
  const dialog = useDialog();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await dialog.confirm({
          title: `Remove ${member.name}?`,
          message: taskCount
            ? `They will be removed from the team and their ${taskCount} task${taskCount === 1 ? "" : "s"} will become unassigned.`
            : "They will be removed from the team.",
          confirmLabel: "Remove",
        });
        if (!ok) return;
        startTransition(async () => {
          const res = await deleteMember(member.id);
          if (!res.ok) dialog.alert({ title: "Couldn't remove member", message: res.message, tone: "error" });
        });
      }}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={`Remove ${member.name}`}
      title="Remove member"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
