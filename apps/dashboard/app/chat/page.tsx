"use client";

import { PageHeader } from "@/components/ui";
import { ChatPanel } from "@/components/ChatPanel";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask about your Moonstride data — answers are grounded in live API calls"
      />
      <div className="min-h-0 flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
