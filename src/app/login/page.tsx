import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { LoginForm, SetupForm } from "@/components/auth-forms";
import { getSessionUser } from "@/lib/auth";
import { needsSetup } from "@/lib/data";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-zinc-100" />}>
          <LoginGate />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginGate() {
  const [user, setup] = await Promise.all([getSessionUser(), needsSetup()]);
  if (user) redirect("/");
  return (
    <>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
          <KanbanSquare className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900">Team Tracker</p>
          <p className="text-[11px] text-zinc-500">
            {setup ? "Create the first admin account" : "Sign in to continue"}
          </p>
        </div>
      </div>
      {setup ? <SetupForm /> : <LoginForm />}
    </>
  );
}
