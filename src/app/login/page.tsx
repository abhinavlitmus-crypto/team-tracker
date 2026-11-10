"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { KanbanSquare, Lock } from "lucide-react";
import { login } from "@/actions/auth";
import type { ActionState } from "@/lib/validation";
import { buttonClass, Field, inputClass } from "@/components/modal";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(login, { ok: false });
  const [, startSubmit] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(() => formAction(formData));
  }

  return (
    <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
            <KanbanSquare className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-zinc-900">Team Tracker</p>
            <p className="text-[11px] text-zinc-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Password">
            <input
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Enter the team password"
              className={inputClass}
            />
          </Field>

          {state.message && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
          )}

          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            <Lock className="h-4 w-4" />
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
