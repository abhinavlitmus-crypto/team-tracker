"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { Check } from "lucide-react";
import { createMember } from "@/actions/members";
import { AVATAR_COLORS, ROLES, ROLE_LABEL } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { buttonClass, Field, inputClass, Modal } from "./modal";

export function MemberModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createMember(prev, formData);
      // Close in the same transition as the refreshed data so the old values never flash.
      if (result.ok) startTransition(onClose);
      return result;
    },
    { ok: false },
  );
  const [, startSubmit] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }

  const errors = state.errors ?? {};

  return (
    <Modal title="Add team member" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <div className="flex items-center gap-3">
          <Avatar name={name || "?"} color={color} size="lg" />
          <p className="text-xs text-zinc-500">Initials are taken from the name.</p>
        </div>

        <Field label="Name" error={errors.name}>
          <input
            name="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            maxLength={100}
            className={inputClass}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input name="email" type="email" placeholder="alex@company.com" className={inputClass} />
        </Field>

        <Field label="Role" error={errors.role}>
          <select name="role" defaultValue="FRONTEND" className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-zinc-600">Avatar color</legend>
          <input type="hidden" name="avatarColor" value={color} />
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                aria-pressed={c === color}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition",
                  c === color ? "ring-2 ring-zinc-900" : "hover:scale-110",
                )}
              >
                {c === color && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            ))}
          </div>
          {errors.avatarColor && <p className="mt-1 text-xs text-red-600">{errors.avatarColor}</p>}
        </fieldset>

        {state.message && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
