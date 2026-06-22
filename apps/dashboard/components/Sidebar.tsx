"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquareText,
  Compass,
  Receipt,
  Wrench,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/enquiries", label: "Enquiries", icon: MessageSquareText },
  { href: "/accounting", label: "Accounting", icon: Receipt },
  { href: "/explorer", label: "API Explorer", icon: Compass },
  { href: "/tools", label: "MCP Tools", icon: Wrench },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide chrome on the login screen.
  if (pathname === "/login") return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-lg font-bold text-white">
          m
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold">moonstride</div>
          <div className="text-[11px] text-slate-400">dashboard</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand/10 text-brand"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <LogOut size={18} /> Sign out
      </button>
    </aside>
  );
}
