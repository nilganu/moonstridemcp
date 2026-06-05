"use client";

import NavHeader from "./NavHeader";
import NavMessages from "./NavMessages";
import NavInput from "./NavInput";
import { useNavigatorChat } from "./useNavigatorChat";

function post(type: string) {
  try {
    window.parent?.postMessage({ source: "moonstride-navigator", type }, "*");
  } catch {
    /* ignore */
  }
}

/**
 * Full-frame Navigator panel for the embeddable iframe (/widget). The compass
 * launcher lives on the host page (embed.js); this renders just the dialog,
 * filling the iframe. Header actions message the parent to close/resize.
 */
export function WidgetEmbed({ chatHeaders }: { chatHeaders?: Record<string, string> }) {
  const { messages, isLoading, sendMessage, startNewChat } = useNavigatorChat(chatHeaders);
  return (
    <div
      className="chat-panel"
      style={{ width: "100%", height: "100vh", maxWidth: "none", borderRadius: 0, border: "none", boxShadow: "none" }}
    >
      <NavHeader
        onClose={() => post("navigator:close")}
        onNewChat={startNewChat}
        isExpanded={false}
        onToggleExpand={() => post("navigator:toggle-expand")}
      />
      <NavMessages messages={messages} onSendMessage={sendMessage} />
      <NavInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
