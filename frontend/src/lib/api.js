const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Auth
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => request("/auth/me"),

  // Conversations
  getConversations: () => request("/conversations"),
  createPrivateConversation: (userId) =>
    request("/conversations/private", { method: "POST", body: JSON.stringify({ userId }) }),
  createGroupConversation: (name, memberIds) =>
    request("/conversations/group", { method: "POST", body: JSON.stringify({ name, memberIds }) }),

  // Messages
  getMessages: (conversationId, before) =>
    request(`/messages/${conversationId}${before ? `?before=${before}` : ""}`),

  // Users
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  getOnlineUsers: () => request("/users/online"),

  // Notifications
  getNotifications: () => request("/notifications"),
  markNotificationsRead: (notificationId) =>
    request("/notifications/read", { method: "POST", body: JSON.stringify({ notificationId }) }),
};
