"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

function safeTimeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { addSuffix: false });
  } catch {
    return "";
  }
}

function getConversationName(conv, currentUser) {
  if (conv.type === "group") return conv.name;
  const other = conv.members?.find((m) => m.id !== currentUser.id);
  return other?.username || "Unknown";
}

function getConversationAvatar(conv, currentUser) {
  if (conv.type === "group") return conv.name?.[0]?.toUpperCase() || "G";
  const other = conv.members?.find((m) => m.id !== currentUser.id);
  return other?.username?.[0]?.toUpperCase() || "?";
}

function getOtherUserId(conv, currentUser) {
  if (conv.type !== "private") return null;
  const other = conv.members?.find((m) => m.id !== currentUser.id);
  return other?.id;
}

export default function ChatSidebar({
  conversations,
  activeConversation,
  onSelect,
  onNewChat,
  onlineUsers,
  currentUser,
  notifications,
  connected,
  onLogout,
}) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const name = getConversationName(conv, currentUser).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const totalUnread = Object.values(notifications).reduce((sum, n) => sum + n, 0);

  return (
    <aside className="w-full h-full bg-dark-900 border-r border-dark-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary-600/20">
              {currentUser.username[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm text-white">{currentUser.username}</div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${connected ? "bg-green-400 shadow-sm shadow-green-400/50" : "bg-yellow-500 animate-pulse"}`}
                />
                <span className="text-xs text-dark-400">{connected ? "Online" : "Reconnecting..."}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-2.5 rounded-xl hover:bg-dark-700 text-dark-300 hover:text-primary-400 transition-all duration-200"
              title="New conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl hover:bg-dark-700 text-dark-300 hover:text-red-400 transition-all duration-200"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-800 border border-dark-600 text-dark-50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 placeholder-dark-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Conversations heading */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
          Messages
        </span>
        {totalUnread > 0 && (
          <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-dark-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-dark-500 text-sm">
              {search ? "No conversations match your search" : "No conversations yet"}
            </p>
            {!search && (
              <button
                onClick={onNewChat}
                className="mt-3 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
              >
                Start chatting
              </button>
            )}
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const name = getConversationName(conv, currentUser);
            const avatar = getConversationAvatar(conv, currentUser);
            const otherUserId = getOtherUserId(conv, currentUser);
            const isOtherOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
            const unreadCount = notifications[conv.id] || 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 ${
                  isActive
                    ? "bg-primary-600/10 border-l-2 border-primary-500"
                    : "hover:bg-dark-800/70 border-l-2 border-transparent"
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                      conv.type === "group"
                        ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
                        : "bg-dark-700 text-dark-200"
                    }`}
                  >
                    {avatar}
                  </div>
                  {conv.type === "private" && isOtherOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-[2.5px] border-dark-900 shadow-sm shadow-green-400/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium text-sm truncate ${unreadCount > 0 ? "text-white" : "text-dark-100"}`}>
                      {name}
                    </span>
                    {conv.lastMessage && (conv.lastMessage.created_at || conv.lastMessage.createdAt) && (
                      <span className="text-[11px] text-dark-500 ml-2 shrink-0">
                        {safeTimeAgo(conv.lastMessage.created_at || conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${unreadCount > 0 ? "text-dark-200 font-medium" : "text-dark-400"}`}>
                      {conv.lastMessage
                        ? `${conv.lastMessage.sender?.username}: ${conv.lastMessage.content}`
                        : "No messages yet"}
                    </p>
                    {unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center ml-2 shrink-0 px-1.5">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Signature */}
      <div className="p-3 border-t border-dark-700/50 text-center">
        <span className="text-[10px] text-dark-500">Conçu par Bazagod</span>
      </div>
    </aside>
  );
}
