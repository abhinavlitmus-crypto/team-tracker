"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { createProject, updateProject } from "@/actions/projects";
import type { ProjectDTO } from "@/lib/types";
import { suggestKey } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { buttonClass, Field, inputClass, Modal } from "./modal";

/** Adds a project, or edits one when `project` is given. */
export function ProjectModal({ project, onClose }: { project?: ProjectDTO; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await (project ? updateProject : createProject)(prev, formData);
      // Close in the same transition as the refreshed data so the old values never flash.
      if (result.ok) startTransition(onClose);
      return result;
    },
    { ok: false },
  );
  const [, startSubmit] = useTransition();
  const [name, setName] = useState(project?.name ?? "");
  const [key, setKey] = useState(project?.key ?? "");
  // On a new project, keep suggesting a key until the admin types their own.
  const [keyTouched, setKeyTouched] = useState(Boolean(project));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }

  const errors = state.errors ?? {};
  const keyChanged = project && key.toUpperCase() !== project.key;

  return (
    <Modal title={project ? `Edit ${project.name}` : "New project"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        {project && <input type="hidden" name="id" value={project.id} />}

        <Field label="Name" error={errors.name}>
          <input
            name="name"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!keyTouched) setKey(suggestKey(e.target.value));
            }}
            placeholder="Website Redesign"
            maxLength={100}
            className={inputClass}
          />
        </Field>

        <Field label="Key" error={errors.key}>
          <input
            name="key"
            value={key}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            }}
            placeholder="WEB"
            maxLength={10}
            autoComplete="off"
            className={`${inputClass} font-mono uppercase`}
          />
          <span className="mt-1 block text-xs text-zinc-500">
            {keyChanged
              ? `Task IDs in this project will change from ${project.key}-… to ${key || "…"}-…`
              : `Used in task IDs, like ${key || "WEB"}-12. 2–10 letters or digits.`}
          </span>
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            name="description"
            defaultValue={project?.description ?? ""}
            rows={3}
            placeholder="What is this project about?"
            maxLength={1000}
            className={inputClass}
          />
        </Field>

        {state.message && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
