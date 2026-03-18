"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function MessageInput({ onSend, socket, conversationId }) {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setText("");
  }, [conversationId]);

  const emitTypingStop = useCallback(() => {
    if (socket && isTyping) {
      socket.emit("typing:stop", { conversationId });
      setIsTyping(false);
    }
  }, [socket, conversationId, isTyping]);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);

    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";

    if (!socket) return;

    if (!isTyping && val.trim()) {
      socket.emit("typing:start", { conversationId });
      setIsTyping(true);
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(emitTypingStop, 2000);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    onSend(text);
    setText("");
    emitTypingStop();
    clearTimeout(typingTimeout.current);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-6 py-3 border-t border-dark-700 bg-dark-900/90 backdrop-blur-md">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-dark-800 border border-dark-600 text-dark-50 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 placeholder-dark-400 resize-none text-sm overflow-y-auto transition-all duration-200"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:hover:bg-primary-600 text-white p-2.5 rounded-xl transition-all duration-200 shrink-0 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </form>
  );
}
