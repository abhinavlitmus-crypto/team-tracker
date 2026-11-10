"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, KanbanSquare, LogOut, Users } from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/team", label: "Team", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  // The login screen stands on its own, without the app chrome.
  if (pathname === "/login") return null;

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
      <form action={logout} className="px-2 pb-2 md:mt-auto md:pb-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4 text-zinc-400" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
