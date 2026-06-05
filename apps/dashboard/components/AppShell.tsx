"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Navigator } from "@/components/navigator/Navigator";

/** App chrome: sidebar + floating widget, except on the bare embed route. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The /widget route is rendered bare for iframe embedding.
  if (pathname?.startsWith("/widget")) return <>{children}</>;

  // Full-bleed routes manage their own height/padding (docs-style layouts).
  const fullBleed = pathname === "/tools";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={
          fullBleed
            ? "h-screen flex-1 overflow-hidden"
            : "flex-1 overflow-y-auto px-6 py-6 lg:px-10"
        }
      >
        {children}
      </main>
      <Navigator />
    </div>
  );
}
