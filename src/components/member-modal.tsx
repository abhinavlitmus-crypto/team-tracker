"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { Check } from "lucide-react";
import { createMember, updateMember } from "@/actions/members";
import { ACCESS_HINT, ACCESS_LABEL, AVATAR_COLORS, ROLES, ROLE_LABEL } from "@/lib/constants";
import type { MemberDTO } from "@/lib/types";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { buttonClass, Field, inputClass, Modal } from "./modal";

/** Adds a member, or edits one when `member` is given. */
export function MemberModal({
  member,
  isSelf = false,
  onClose,
}: {
  member?: MemberDTO;
  /** True when an admin edits their own account (their access is locked). */
  isSelf?: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await (member ? updateMember : createMember)(prev, formData);
      // Close in the same transition as the refreshed data so the old values never flash.
      if (result.ok) startTransition(onClose);
      return result;
    },
    { ok: false },
  );
  const [, startSubmit] = useTransition();
  const [name, setName] = useState(member?.name ?? "");
  const [color, setColor] = useState(member?.avatarColor ?? AVATAR_COLORS[0]);
  const [access, setAccess] = useState(member?.access ?? "MEMBER");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }

  const errors = state.errors ?? {};

  return (
    <Modal title={member ? `Edit ${member.name}` : "Add team member"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        {member && <input type="hidden" name="id" value={member.id} />}
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
          <input
            name="email"
            type="email"
            defaultValue={member?.email ?? ""}
            placeholder="alex@company.com"
            autoComplete="off"
            className={inputClass}
          />
        </Field>

        <Field label="Role" error={errors.role}>
          <select name="role" defaultValue={member?.role ?? "FRONTEND"} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Access" error={errors.access}>
          {/* Disabled selects aren't submitted, so send the locked value separately. */}
          {isSelf && <input type="hidden" name="access" value="ADMIN" />}
          <select
            name={isSelf ? undefined : "access"}
            value={access}
            onChange={(e) => setAccess(e.target.value as typeof access)}
            disabled={isSelf}
            className={inputClass}
          >
            <option value="MEMBER">{ACCESS_LABEL.MEMBER}</option>
            <option value="ADMIN">{ACCESS_LABEL.ADMIN}</option>
          </select>
          <span className="mt-1 block text-xs text-zinc-500">
            {isSelf ? "You can't remove your own admin access." : ACCESS_HINT[access]}
          </span>
        </Field>

        <Field
          label={member ? (member.hasLogin ? "Reset password" : "Set password") : "Starting password"}
          error={errors.password}
        >
          <input name="password" type="password" autoComplete="new-password" className={inputClass} />
          <span className="mt-1 block text-xs text-zinc-500">
            {member
              ? member.hasLogin
                ? "Leave blank to keep their current password. A new one signs them out everywhere."
                : "This member can't sign in yet. Set a password and share it with them."
              : "At least 8 characters. Share it with them; they can change it after signing in."}
          </span>
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
            {pending ? "Saving…" : member ? "Save changes" : "Add member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
