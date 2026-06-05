"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import NavHeader from "./NavHeader";
import NavMessages from "./NavMessages";
import NavInput from "./NavInput";
import { CompassIcon, FabCloseIcon } from "./icons";
import { useNavigatorChat } from "./useNavigatorChat";

/**
 * In-app "Navigator" assistant — exact port of the reference widget design
 * (compass FAB + expandable dialog), wired to this app's /api/chat.
 */
export function Navigator({ chatHeaders }: { chatHeaders?: Record<string, string> }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { messages, isLoading, sendMessage, startNewChat } = useNavigatorChat(chatHeaders);

  // Hide on login and the bare embed route.
  if (pathname === "/login" || pathname?.startsWith("/widget")) return null;

  return (
    <>
      <button
        className={`compass-fab ${isOpen ? "compass-fab--open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close Aria" : "Open Aria"}
        data-tooltip="Ask Aria"
      >
        <CompassIcon />
        <FabCloseIcon />
      </button>

      {isOpen && (
        <div className="chat-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className={`chat-panel ${isExpanded ? "chat-panel--expanded" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <NavHeader
              onClose={() => setIsOpen(false)}
              onNewChat={startNewChat}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded((v) => !v)}
            />
            <NavMessages messages={messages} onSendMessage={sendMessage} />
            <NavInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>
      )}
    </>
  );
}
