import { HeaderMark } from "./icons";

interface NavHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function NavHeader({ onClose, onNewChat, isExpanded, onToggleExpand }: NavHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header__mark">
        <HeaderMark />
      </div>

      <div className="chat-header__text">
        <h2>Aria</h2>
        <p>Moonstride AI assistant</p>
      </div>

      <span className="chat-header__online-dot" title="Online" aria-label="Online" />

      <div className="chat-header__actions">
        <button className="chat-header__btn" onClick={onNewChat} title="Start new chat" aria-label="Start new chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          className="chat-header__btn"
          onClick={onToggleExpand}
          title={isExpanded ? "Shrink" : "Expand"}
          aria-label={isExpanded ? "Shrink chat" : "Expand chat"}
        >
          {isExpanded ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 1v4H1M8 1v4h4M5 12V8H1M8 12V8h4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 5V1h4M8 1h4v4M12 8v4H8M5 12H1V8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <button className="chat-header__btn" onClick={onClose} aria-label="Close chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
