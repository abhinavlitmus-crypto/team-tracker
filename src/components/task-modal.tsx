"use client";

import { startTransition, useActionState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { deleteTask, saveTask } from "@/actions/tasks";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/constants";
import type { MemberDTO, TaskDTO } from "@/lib/types";
import type { ActionState } from "@/lib/validation";
import { useDialog } from "./dialog";
import { buttonClass, Field, inputClass, Modal } from "./modal";

export function TaskModal({
  members,
  task,
  defaultStatus = "TODO",
  onClose,
}: {
  members: MemberDTO[];
  task?: TaskDTO;
  defaultStatus?: TaskStatus;
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
