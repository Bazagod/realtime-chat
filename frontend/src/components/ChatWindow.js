"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({ conversation, currentUser, socket, onlineUsers, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const otherMember =
    conversation.type === "private"
      ? conversation.members?.find((m) => m.id !== currentUser.id)
      : null;
  const convName = conversation.type === "group" ? conversation.name : otherMember?.username || "Chat";
  const isOtherOnline = otherMember ? onlineUsers.has(otherMember.id) : false;
  const memberCount = conversation.members?.length || 0;
  const onlineCount = conversation.type === "group"
    ? conversation.members?.filter((m) => onlineUsers.has(m.id) || m.id === currentUser.id).length || 0
    : 0;

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessages([]);
      setHasMore(true);
      try {
        const data = await api.getMessages(conversation.id);
        if (!cancelled) {
          setMessages(data);
          setHasMore(data.length >= 50);
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => { cancelled = true; };
  }, [conversation.id, scrollToBottom]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversation_id === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    const handleTypingStart = ({ userId, username, conversationId }) => {
      if (conversationId !== conversation.id || userId === currentUser.id) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId) ? prev : [...prev, { userId, username }]
      );
    };

    const handleTypingStop = ({ userId, conversationId }) => {
      if (conversationId !== conversation.id) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, conversation.id, currentUser.id, scrollToBottom]);

  useEffect(() => {
    setTypingUsers([]);
  }, [conversation.id]);

  async function handleLoadMore() {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoadingMore(true);
    try {
      const container = containerRef.current;
      const scrollHeightBefore = container?.scrollHeight || 0;

      const older = await api.getMessages(conversation.id, oldest.created_at);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length >= 50);

      requestAnimationFrame(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }
      });
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSendMessage(content) {
    if (!socket || !content.trim()) return;
    socket.emit("message:send", { conversationId: conversation.id, content });
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-950">
      {/* Chat header */}
      <header className="px-4 md:px-6 py-3.5 border-b border-dark-700 bg-dark-900/90 backdrop-blur-md flex items-center gap-3 shrink-0">
        {/* Back button (mobile only) */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-dark-700 text-dark-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              conversation.type === "group"
                ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
                : "bg-dark-700 text-dark-200"
            }`}
          >
            {conversation.type === "group"
              ? (conversation.name?.[0]?.toUpperCase() || "G")
              : (otherMember?.username?.[0]?.toUpperCase() || "?")}
          </div>
          {conversation.type === "private" && isOtherOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-dark-900" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-white text-sm truncate">{convName}</h2>
          <p className="text-xs text-dark-400">
            {conversation.type === "group" ? (
              `${memberCount} members, ${onlineCount} online`
            ) : isOtherOnline ? (
              <span className="text-green-400">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-1">
        {hasMore && messages.length > 0 && (
          <div className="text-center py-3">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              {loadingMore ? (
                <>
                  <div className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                "Load older messages"
              )}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-dark-400 text-sm">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="text-dark-400 text-sm">No messages yet. Say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const showAvatar = !prev || prev.sender_id !== msg.sender_id;
            const msgDate = new Date(msg.created_at || msg.createdAt || 0);
            const prevDate = prev ? new Date(prev.created_at || prev.createdAt || 0) : null;
            const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

            return (
              <div key={msg.id}>
                {showDate && !isNaN(msgDate.getTime()) && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-dark-700" />
                    <span className="text-[11px] text-dark-500 font-medium px-2">
                      {msgDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex-1 h-px bg-dark-700" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={msg.sender_id === currentUser.id}
                  showAvatar={showAvatar}
                />
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        socket={socket}
        conversationId={conversation.id}
      />
    </div>
  );
}
