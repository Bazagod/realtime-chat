"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { api } from "@/lib/api";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import NewConversationModal from "@/components/NewConversationModal";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const { socket, connected } = useSocket();
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [notifications, setNotifications] = useState({});

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleOnline = ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    };
    const handleOffline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };
    const handleNewMessage = (message) => {
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv.id === message.conversation_id
            ? { ...conv, lastMessage: message, updated_at: new Date().toISOString() }
            : conv
        );
        return updated.sort((a, b) => {
          const tA = new Date(a.updated_at).getTime();
          const tB = new Date(b.updated_at).getTime();
          return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        });
      });

      if (activeConversation?.id !== message.conversation_id && message.sender_id !== user?.id) {
        setNotifications((prev) => ({
          ...prev,
          [message.conversation_id]: (prev[message.conversation_id] || 0) + 1,
        }));
      }
    };
    const handleConversationCreated = () => {
      loadConversations();
    };

    socket.on("user:online", handleOnline);
    socket.on("user:offline", handleOffline);
    socket.on("message:new", handleNewMessage);
    socket.on("conversation:created", handleConversationCreated);

    return () => {
      socket.off("user:online", handleOnline);
      socket.off("user:offline", handleOffline);
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:created", handleConversationCreated);
    };
  }, [socket, activeConversation, user, loadConversations]);

  function handleSelectConversation(conv) {
    setActiveConversation(conv);
    setNotifications((prev) => {
      const next = { ...prev };
      delete next[conv.id];
      return next;
    });
    if (socket) socket.emit("conversation:read", { conversationId: conv.id });
    setShowSidebar(false);
  }

  async function handleConversationCreated(conv) {
    setShowNewChat(false);
    if (socket) socket.emit("conversation:join", { conversationId: conv.id });
    await loadConversations();
    setActiveConversation(conv);
    setShowSidebar(false);
  }

  function handleBack() {
    setShowSidebar(true);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-400 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-dark-950">
      {/* Sidebar - hidden on mobile when a conversation is active */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 shrink-0`}>
        <ChatSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelect={handleSelectConversation}
          onNewChat={() => setShowNewChat(true)}
          onlineUsers={onlineUsers}
          currentUser={user}
          notifications={notifications}
          connected={connected}
          onLogout={logout}
        />
      </div>

      {/* Chat area */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0`}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            currentUser={user}
            socket={socket}
            onlineUsers={onlineUsers}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-950">
            <div className="text-center px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-dark-300 mb-2">Welcome to RealChat</h2>
              <p className="text-dark-500 text-sm max-w-xs mx-auto">
                Select a conversation from the sidebar or start a new one to begin messaging.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-6 btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start a conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <NewConversationModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleConversationCreated}
          currentUser={user}
        />
      )}
    </div>
  );
}
