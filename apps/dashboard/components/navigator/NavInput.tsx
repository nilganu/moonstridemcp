"use client";

import { useRef, useState, type KeyboardEvent } from "react";

interface NavInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function NavInput({ onSend, disabled }: NavInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  return (
    <div className="chat-input">
      <div className="accuracy-info">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6.5" stroke="#D4900A" strokeWidth="1" />
          <path d="M7 4v3.5" stroke="#D4900A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="10" r="0.7" fill="#D4900A" />
        </svg>
        <p>
          Responses are generated from your moonstride data. Accuracy may vary based on your
          specific context. Always verify before acting.
        </p>
      </div>
      <div className="chat-input__wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input__field"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
        />
        <button
          className="chat-input__send"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="chat-input__disclaimer">
        AI responses are for guidance only. Please review before use.{" "}
        <a href="https://www.moonstride.com/terms-and-conditions#ai-addons" target="_blank" rel="noopener noreferrer">
          Terms &amp; Conditions
        </a>{" "}
        apply.
      </p>
    </div>
  );
}
