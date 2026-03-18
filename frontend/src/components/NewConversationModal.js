"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

export default function NewConversationModal({ onClose, onCreated, currentUser }) {
  const [tab, setTab] = useState("private");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, [tab]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  function handleSearch(q) {
    setSearch(q);
    if (q.length < 2) {
      setUsers([]);
      return;
    }

    clearTimeout(searchTimeout.current);
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await api.searchUsers(q);
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleCreatePrivate(userId) {
    setLoading(true);
    setError("");
    try {
      const conv = await api.createPrivateConversation(userId);
      onCreated(conv);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return setError("Group name is required");
    if (selectedUsers.length < 1) return setError("Select at least one member");

    setLoading(true);
    setError("");
    try {
      const conv = await api.createGroupConversation(
        groupName,
        selectedUsers.map((u) => u.id)
      );
      onCreated(conv);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(user) {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">New Conversation</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          <button
            onClick={() => { setTab("private"); setSelectedUsers([]); setError(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              tab === "private"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-dark-400 hover:text-dark-200"
            }`}
          >
            Private Chat
          </button>
          <button
            onClick={() => { setTab("group"); setError(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              tab === "group"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-dark-400 hover:text-dark-200"
            }`}
          >
            Group Chat
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {tab === "group" && (
            <input
              type="text"
              className="input-field"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="input-field pl-10"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Selected (group mode) */}
          {tab === "group" && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="bg-primary-600/15 text-primary-300 text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 border border-primary-600/20"
                >
                  {u.username}
                  <button onClick={() => toggleUser(u)} className="hover:text-white transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User list */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => (tab === "private" ? handleCreatePrivate(u.id) : toggleUser(u))}
                disabled={loading}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  selectedUsers.some((s) => s.id === u.id)
                    ? "bg-primary-600/10 border border-primary-600/20"
                    : "hover:bg-dark-800 border border-transparent"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
                    {u.username[0].toUpperCase()}
                  </div>
                  {u.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-dark-900" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">{u.username}</span>
                  <p className="text-xs text-dark-400">
                    {u.is_online ? (
                      <span className="text-green-400">Online</span>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
                {tab === "group" && selectedUsers.some((s) => s.id === u.id) && (
                  <svg className="w-5 h-5 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {tab === "private" && (
                  <svg className="w-4 h-4 text-dark-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
            {search.length >= 2 && !searching && users.length === 0 && (
              <div className="text-center py-6">
                <p className="text-dark-500 text-sm">No users found</p>
              </div>
            )}
            {search.length < 2 && (
              <div className="text-center py-6">
                <p className="text-dark-500 text-sm">Type at least 2 characters to search</p>
              </div>
            )}
          </div>

          {tab === "group" && (
            <button
              onClick={handleCreateGroup}
              disabled={loading || selectedUsers.length === 0 || !groupName.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Group (${selectedUsers.length} member${selectedUsers.length !== 1 ? "s" : ""})`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
