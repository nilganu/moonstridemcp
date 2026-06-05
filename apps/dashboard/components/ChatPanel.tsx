"use client";

import { useRef, useState } from "react";
import { Bot, Send, User, Wrench } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { ChatTable, type ChatTableData } from "@/components/ChatTable";

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: Array<{ tool: string; ok: boolean }>;
  table?: ChatTableData | null;
}

const SUGGESTIONS = [
  "Total sales in the last 30 days",
  "Enquiries this month",
  "Bookings departing in the next month",
  "Show the pipeline stages",
];

export function ChatPanel({
  compact = false,
  chatHeaders,
}: {
  /** Tighter spacing/sizing for the floating widget. */
  compact?: boolean;
  /** Extra headers sent to /api/chat (e.g. widget key for embedded use). */
  chatHeaders?: Record<string, string>;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...chatHeaders },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: body.reply,
          tools: (body.toolTrace ?? []).map((t: { tool: string; ok: boolean }) => ({
            tool: t.tool,
            ok: t.ok,
          })),
          table: body.table ?? null,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className={`flex-1 space-y-4 overflow-y-auto ${compact ? "p-3" : "card"}`}>
        {messages.length === 0 && (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <Bot className="mx-auto mb-3 text-brand" size={compact ? 26 : 32} />
              <p className="mb-4 text-sm text-slate-500">Ask about your Moonstride data.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn-ghost text-xs" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "max-w-[80%] bg-brand text-white"
                  : "max-w-[88%] bg-slate-100 dark:bg-slate-800"
              }`}
            >
              {m.tools && m.tools.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.tools.map((t, j) => (
                    <span
                      key={j}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.ok
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      <Wrench size={10} /> {t.tool.replace("moonstride_", "")}
                    </span>
                  ))}
                </div>
              )}
              {m.role === "assistant" ? (
                <>
                  <Markdown>{m.content}</Markdown>
                  {m.table && <ChatTable data={m.table} />}
                </>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
            {m.role === "user" && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 dark:bg-slate-700">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Bot size={16} className="text-brand" /> Thinking…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className={`flex gap-2 ${compact ? "border-t border-slate-200 p-3 dark:border-slate-800" : "mt-4"}`}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input flex-1"
          placeholder="Ask about bookings, enquiries, sales…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn-brand" type="submit" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
