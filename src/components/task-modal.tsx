"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { Lock, Trash2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { deleteTask, saveTask, updateTaskStatus } from "@/actions/tasks";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatDayKey } from "@/lib/dates";
import type { CurrentUser, MemberDTO, TaskDTO } from "@/lib/types";
import type { ActionState } from "@/lib/validation";
import { Avatar } from "./avatar";
import { PriorityBadge } from "./badges";
import { useDialog } from "./dialog";
import { buttonClass, Field, inputClass, Modal } from "./modal";

/** True when the viewer may change this task's status (admins, or the assignee). */
export function canUpdateStatus(viewer: CurrentUser, task: Pick<TaskDTO, "assigneeId">) {
  return viewer.access === "ADMIN" || task.assigneeId === viewer.id;
}

/**
 * Admins get the full edit form. Everyone else sees the task read-only, with a
 * status picker when the task is assigned to them.
 */
export function TaskModal({
  viewer,
  members,
  task,
  defaultStatus = "TODO",
  onClose,
}: {
  viewer: CurrentUser;
  members: MemberDTO[];
  task?: TaskDTO;
  defaultStatus?: TaskStatus;
  onClose: () => void;
}) {
  if (viewer.access !== "ADMIN") {
    return task ? <TaskView viewer={viewer} task={task} onClose={onClose} /> : null;
  }
  return <TaskForm members={members} task={task} defaultStatus={defaultStatus} onClose={onClose} />;
}

function TaskView({ viewer, task, onClose }: { viewer: CurrentUser; task: TaskDTO; onClose: () => void }) {
  const [status, setStatus] = useState(task.status);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editable = canUpdateStatus(viewer, task);

  function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await updateTaskStatus({ taskId: task.id, status });
      if (res.ok) startTransition(onClose);
      else setError(res.message ?? "Could not update the status.");
    });
  }

  return (
    <Modal title={task.key} onClose={onClose}>
      <form onSubmit={onSave} className="space-y-4 p-5">
        <div>
          <h3 className="wrap-break-word text-base font-semibold text-zinc-900">{task.title}</h3>
          {task.description ? (
            <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm text-zinc-600">{task.description}</p>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-400">No description.</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-zinc-50 p-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Assignee</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-zinc-800">
              {task.assignee ? (
                <>
                  <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size="sm" />
                  {task.assignee.id === viewer.id ? "You" : task.assignee.name}
                </>
              ) : (
                "Unassigned"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Priority</dt>
            <dd className="mt-0.5">
              <PriorityBadge priority={task.priority} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Due date</dt>
            <dd className="mt-0.5 text-zinc-800">{task.dueDate ? formatDayKey(task.dueDate, "EEE, MMM d, yyyy") : "None"}</dd>
          </div>
          {!editable && (
            <div>
              <dt className="text-xs text-zinc-500">Status</dt>
              <dd className="mt-0.5 text-zinc-800">{STATUS_LABEL[task.status]}</dd>
            </div>
          )}
        </dl>

        {editable ? (
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              autoFocus
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Lock className="h-3.5 w-3.5" /> Only the assignee or an admin can change this task.
          </p>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            {editable ? "Cancel" : "Close"}
          </button>
          {editable && (
            <button type="submit" disabled={saving || status === task.status} className={buttonClass.primary}>
              {saving ? "Saving…" : "Update status"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function TaskForm({
  members,
  task,
  defaultStatus,
  onClose,
}: {
  members: MemberDTO[];
  task?: TaskDTO;
  defaultStatus: TaskStatus;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveTask(prev, formData);
      // Close in the same transition as the refreshed data so the old values never flash.
      if (result.ok) startTransition(onClose);
      return result;
    },
    { ok: false },
  );
  const [, startSubmit] = useTransition();
  const [deleting, startDelete] = useTransition();
  const dialog = useDialog();

  // Submit manually so React doesn't reset the fields when validation fails.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }

  async function onDelete() {
    if (!task) return;
    const ok = await dialog.confirm({
      title: `Delete ${task.key}?`,
      message: `"${task.title}" will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete task",
    });
    if (!ok) return;
    startDelete(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) startTransition(onClose);
      else dialog.alert({ title: "Couldn't delete task", message: result.message, tone: "error" });
    });
  }

  const errors = state.errors ?? {};
  const busy = pending || deleting;

  return (
    <Modal title={task ? `Edit ${task.key}` : "New task"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        {task && <input type="hidden" name="id" value={task.id} />}

        <Field label="Title" error={errors.title}>
          <input
            name="title"
            defaultValue={task?.title}
            autoFocus
            placeholder="What needs to be done?"
            className={inputClass}
            maxLength={200}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            name="description"
            defaultValue={task?.description ?? ""}
            rows={4}
            placeholder="Add more detail…"
            maxLength={5000}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" error={errors.status}>
            <select name="status" defaultValue={task?.status ?? defaultStatus} className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority" error={errors.priority}>
            <select name="priority" defaultValue={task?.priority ?? "MEDIUM"} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assignee" error={errors.assigneeId}>
            <select name="assigneeId" defaultValue={task?.assigneeId ?? ""} className={inputClass}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due date" error={errors.dueDate}>
            <input
              type="date"
              name="dueDate"
              defaultValue={task?.dueDate ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        {state.message && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
          <div>
            {task && (
              <button type="button" onClick={onDelete} disabled={busy} className={buttonClass.danger}>
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={buttonClass.primary}>
              {pending ? "Saving…" : task ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
