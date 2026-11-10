"use client";

import { startTransition, useActionState, useTransition, type FormEvent } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { changePassword, login, setupAdmin } from "@/actions/auth";
import type { ActionState } from "@/lib/validation";
import { buttonClass, Field, inputClass, Modal } from "./modal";

/** Submits manually so React doesn't clear the fields when validation fails. */
function useForm(action: (prev: ActionState, data: FormData) => Promise<ActionState>) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [, startSubmit] = useTransition();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }
  return { state, pending, onSubmit, errors: state.errors ?? {} };
}

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={
        state.ok
          ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

export function LoginForm() {
  const { state, pending, onSubmit, errors } = useForm(login);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoFocus autoComplete="username" placeholder="you@company.com" className={inputClass} />
      </Field>
      <Field label="Password" error={errors.password}>
        <input name="password" type="password" autoComplete="current-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
        <Lock className="h-4 w-4" />
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-zinc-500">Forgot your password? Ask an admin to reset it.</p>
    </form>
  );
}

export function SetupForm() {
  const { state, pending, onSubmit, errors } = useForm(setupAdmin);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
        No one can sign in yet. Create the admin account that will manage the team. If your email
        already belongs to a team member, that member becomes the admin.
      </p>
      <Field label="Setup key" error={errors.setupKey}>
        <input name="setupKey" type="password" autoFocus autoComplete="off" placeholder="AUTH_PASSWORD from .env" className={inputClass} />
      </Field>
      <Field label="Your name" error={errors.name}>
        <input name="name" autoComplete="name" maxLength={100} className={inputClass} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoComplete="username" className={inputClass} />
      </Field>
      <Field label="Password" error={errors.password}>
        <input name="password" type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Confirm password" error={errors.confirm}>
        <input name="confirm" type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
        <ShieldCheck className="h-4 w-4" />
        {pending ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { state, pending, onSubmit, errors } = useForm(async (prev, data) => {
    const result = await changePassword(prev, data);
    if (result.ok) startTransition(onClose);
    return result;
  });
  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <Field label="Current password" error={errors.current}>
          <input name="current" type="password" autoFocus autoComplete="current-password" className={inputClass} />
        </Field>
        <Field label="New password" error={errors.password}>
          <input name="password" type="password" autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <input name="confirm" type="password" autoComplete="new-password" className={inputClass} />
        </Field>
        <p className="text-xs text-zinc-500">You&apos;ll stay signed in here; other devices will be signed out.</p>
        <FormMessage state={state} />
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
