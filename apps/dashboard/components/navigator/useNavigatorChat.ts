"use client";

import { useCallback, useState } from "react";
import type { ChatTableData } from "@/components/ChatTable";

export interface ToolActivity {
  tool_name: string;
  display_name: string;
  status: "running" | "done" | "error";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolActivities?: ToolActivity[];
  table?: ChatTableData | null;
  isStreaming?: boolean;
}

export function useNavigatorChat(chatHeaders?: Record<string, string>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const history = [...messages, { role: "user" as const, content: text }];
      setMessages([...history, { role: "assistant", content: "", isStreaming: true, toolActivities: [] }]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...chatHeaders },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

        const toolActivities: ToolActivity[] = (body.toolTrace ?? []).map(
          (t: { tool: string; ok: boolean }) => ({
            tool_name: t.tool,
            display_name: t.tool.replace("moonstride_", "").replace(/_/g, " "),
            status: t.ok ? "done" : "error",
          }),
        );

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: body.reply ?? "",
            toolActivities,
            table: body.table ?? null,
            isStreaming: false,
          };
          return updated;
        });
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Sorry, something went wrong: ${(err as Error).message}`,
            isStreaming: false,
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, chatHeaders],
  );

  const startNewChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, startNewChat };
}
