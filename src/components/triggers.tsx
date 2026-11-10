"use client";

import { useState, useTransition, type ReactNode } from "react";
import { FolderPlus, Pencil, Trash2, UserPlus } from "lucide-react";
import { deleteMember } from "@/actions/members";
import { deleteProject } from "@/actions/projects";
import type { CurrentUser, MemberDTO, ProjectDTO, TaskDTO } from "@/lib/types";
import { useDialog } from "./dialog";
import { MemberModal } from "./member-modal";
import { buttonClass } from "./modal";
import { ProjectModal } from "./project-modal";
import { TaskModal } from "./task-modal";

/** Makes any task row clickable to open the task (editable for admins). */
export function EditTaskTrigger({
  viewer,
  task,
  members,
  projects,
  children,
  className,
}: {
  viewer: CurrentUser;
  task: TaskDTO;
  members: MemberDTO[];
  projects: ProjectDTO[];
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <TaskModal viewer={viewer} task={task} members={members} projects={projects} onClose={() => setOpen(false)} />}
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

export function EditMemberButton({ member, isSelf }: { member: MemberDTO; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Edit ${member.name}`}
        title="Edit member, access and password"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && <MemberModal member={member} isSelf={isSelf} onClose={() => setOpen(false)} />}
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

export function AddProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        <FolderPlus className="h-4 w-4" /> New project
      </button>
      {open && <ProjectModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditProjectButton({ project }: { project: ProjectDTO }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={`Edit ${project.name}`}
        title="Edit project"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && <ProjectModal project={project} onClose={() => setOpen(false)} />}
    </>
  );
}

export function DeleteProjectButton({ project }: { project: ProjectDTO }) {
  const [pending, startTransition] = useTransition();
  const dialog = useDialog();
  const hasTasks = project.taskCount > 0;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (hasTasks) {
          await dialog.alert({
            title: `Can't delete ${project.name}`,
            message: `It still has ${project.taskCount} task${project.taskCount === 1 ? "" : "s"}. Move them to another project or delete them first.`,
            tone: "info",
          });
          return;
        }
        const ok = await dialog.confirm({
          title: `Delete ${project.name}?`,
          message: "The project will be permanently deleted. This can't be undone.",
          confirmLabel: "Delete project",
        });
        if (!ok) return;
        startTransition(async () => {
          const res = await deleteProject(project.id);
          if (!res.ok) dialog.alert({ title: "Couldn't delete project", message: res.message, tone: "error" });
        });
      }}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={`Delete ${project.name}`}
      title={hasTasks ? "Only empty projects can be deleted" : "Delete project"}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
