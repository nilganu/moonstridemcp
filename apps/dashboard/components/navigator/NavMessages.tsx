"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatTable } from "@/components/ChatTable";
import type { ChatMessage, ToolActivity } from "./useNavigatorChat";
import { AssistantAvatarIcon, WelcomeMark } from "./icons";

const SUGGESTIONS = [
  "Total sales in the last 30 days",
  "Bookings departing in the next month",
  "How many enquiries this month?",
  "Show the pipeline stages",
];

function ToolStatus({ activities }: { activities: ToolActivity[] }) {
  if (!activities || activities.length === 0) return null;
  return (
    <div className="tool-status">
      {activities.map((a, i) => (
        <div key={i} className={`tool-status__item tool-status__item--${a.status}`}>
          {a.status === "running" && <span className="tool-status__spinner" />}
          {a.status === "done" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {a.status === "error" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          <span className="tool-status__label">{a.display_name}</span>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`message message--${msg.role}`}>
      {msg.role === "assistant" && (
        <div className="message__avatar">
          <AssistantAvatarIcon />
        </div>
      )}
      <div className="message__content">
        {msg.role === "assistant" && msg.toolActivities && msg.toolActivities.length > 0 && (
          <ToolStatus activities={msg.toolActivities} />
        )}

        {msg.role === "assistant" ? (
          <div className="message__markdown">
            {msg.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            ) : null}
            {msg.isStreaming && <span className="typing-cursor" />}
            {msg.table && <ChatTable data={msg.table} />}
            {!msg.isStreaming && msg.content && (
              <div className="message__disclaimer">
                AI responses are generated from your moonstride data. Accuracy may vary
                based on your specific context. Always verify before acting.
              </div>
            )}
          </div>
        ) : (
          <p>{msg.content}</p>
        )}
      </div>
    </div>
  );
}

export default function NavMessages({
  messages,
  onSendMessage,
}: {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--welcome">
        <div className="message message--assistant">
          <div className="message__avatar message__avatar--welcome">
            <WelcomeMark />
          </div>
          <div className="message__content">
            Hi! I&apos;m <strong>Aria</strong> 👋
            <br />
            Ask me anything about your moonstride data — bookings, enquiries, sales, payments and more.
          </div>
        </div>

        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="suggestion-chip" onClick={() => onSendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
