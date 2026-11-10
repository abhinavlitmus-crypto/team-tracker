"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, KanbanSquare, KeyRound, ListChecks, LogOut, Users } from "lucide-react";
import { logout } from "@/actions/auth";
import { ACCESS_LABEL } from "@/lib/constants";
import type { CurrentUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "./auth-forms";
import { Avatar } from "./avatar";

const NAV = [
  { href: "/my-tasks", label: "My tasks", icon: ListChecks },
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/team", label: "Team", icon: Users },
];

export function Sidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const [changingPassword, setChangingPassword] = useState(false);

  // The login screen stands on its own, without the app chrome.
  if (pathname === "/login" || !user) return null;

  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-200 bg-zinc-50 md:h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-4 py-3 md:py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
          TT
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900">Team Tracker</p>
          <p className="text-[11px] text-zinc-500">Core Platform</p>
        </div>
      </div>
      <nav className="flex gap-1 px-2 pb-2 md:flex-col md:pb-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200"
                  : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-indigo-600" : "text-zinc-400")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center gap-1 border-t border-zinc-200 px-2 pb-2 pt-2 md:mt-auto md:flex-col md:items-stretch md:pb-3">
        <div className="flex min-w-0 items-center gap-2 px-2.5 py-1.5">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
            <p className="text-[11px] text-zinc-500">{ACCESS_LABEL[user.access]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setChangingPassword(true)}
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
        >
          <KeyRound className="h-4 w-4 text-zinc-400" />
          Change password
        </button>
        <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4 text-zinc-400" />
          Sign out
        </button>
        </form>
      </div>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </aside>
  );
}

export function SidebarSkeleton() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <div className="hidden shrink-0 border-r border-zinc-200 bg-zinc-50 md:block md:h-screen md:w-56" />;
}
