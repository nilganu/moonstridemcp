"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, X } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";

/**
 * Floating chat launcher available on every dashboard page. Clicking the bubble
 * opens the assistant as a full-screen chat overlay.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Don't show on the login screen, the dedicated chat page, or the embed route.
  if (pathname === "/login" || pathname === "/chat" || pathname?.startsWith("/widget")) {
    return null;
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950">
          <header className="flex items-center justify-between bg-brand px-5 py-3 text-white">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Bot size={20} /> Moonstride Assistant
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg p-1 hover:bg-white/15"
            >
              <X size={22} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="mx-auto flex h-full max-w-4xl flex-col px-4 py-4 sm:px-6">
              <ChatPanel />
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-xl transition hover:bg-brand-600"
          aria-label="Open assistant"
        >
          <Bot size={24} />
        </button>
      )}
    </>
  );
}
