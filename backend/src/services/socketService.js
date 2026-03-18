const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { pub, sub, isRedisAvailable } = require("../config/redis");
const { authenticateSocket } = require("../middleware/auth");
const presenceService = require("./presenceService");
const messageService = require("./messageService");
const notificationService = require("./notificationService");
const env = require("../config/env");

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  if (isRedisAvailable()) {
    io.adapter(createAdapter(pub, sub));
    console.log("✅ Socket.io Redis adapter enabled");
  } else {
    console.warn("⚠️  Socket.io running without Redis adapter (single-instance mode)");
  }

  // JWT authentication middleware
  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`⚡ ${user.username} connected (${socket.id})`);

    // ── Join personal room for targeted events ──────────────
    socket.join(`user:${user.id}`);

    // ── Join all conversation rooms ─────────────────────────
    const { ConversationMember } = require("../models");
    const memberships = await ConversationMember.findAll({
      where: { user_id: user.id },
      attributes: ["conversation_id"],
    });
    memberships.forEach((m) => socket.join(`conv:${m.conversation_id}`));

    // ── Set online & broadcast ──────────────────────────────
    await presenceService.setOnline(user.id);
    io.emit("user:online", { userId: user.id, username: user.username });

    // ── Heartbeat ───────────────────────────────────────────
    socket.on("heartbeat", () => presenceService.heartbeat(user.id));

    // ── Send message ────────────────────────────────────────
    socket.on("message:send", async (data, ack) => {
      try {
        const { conversationId, content } = data;
        if (!conversationId || !content?.trim()) return;

        const message = await messageService.create({
          conversationId,
          senderId: user.id,
          content: content.trim(),
        });

        // Broadcast to all members in the conversation room
        io.to(`conv:${conversationId}`).emit("message:new", message);

        // Create notifications for offline members
        const memberIds = await messageService.getConversationMemberIds(conversationId);
        for (const memberId of memberIds) {
          if (memberId === user.id) continue;
          const isOnline = await presenceService.isOnline(memberId);
          if (!isOnline) {
            await notificationService.create({
              userId: memberId,
              type: "new_message",
              data: {
                conversationId,
                senderName: user.username,
                preview: content.substring(0, 100),
              },
            });
          }
          // Emit notification event to online users viewing other conversations
          io.to(`user:${memberId}`).emit("notification:new", {
            conversationId,
            senderName: user.username,
            preview: content.substring(0, 100),
          });
        }

        if (typeof ack === "function") ack({ success: true, message });
      } catch (err) {
        console.error("message:send error:", err);
        if (typeof ack === "function") ack({ error: "Failed to send message" });
      }
    });

    // ── Typing indicators ───────────────────────────────────
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit("typing:start", {
        userId: user.id,
        username: user.username,
        conversationId,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit("typing:stop", {
        userId: user.id,
        conversationId,
      });
    });

    // ── Mark conversation as read ───────────────────────────
    socket.on("conversation:read", async ({ conversationId }) => {
      const { ConversationMember } = require("../models");
      await ConversationMember.update(
        { last_read_at: new Date() },
        { where: { conversation_id: conversationId, user_id: user.id } }
      );
    });

    // ── Join a new conversation room (after creation) ───────
    socket.on("conversation:join", async ({ conversationId }) => {
      socket.join(`conv:${conversationId}`);

      const memberIds = await messageService.getConversationMemberIds(conversationId);
      for (const memberId of memberIds) {
        if (memberId === user.id) continue;
        io.to(`user:${memberId}`).emit("conversation:created", { conversationId });

        const memberSockets = await io.in(`user:${memberId}`).fetchSockets();
        for (const s of memberSockets) {
          s.join(`conv:${conversationId}`);
        }
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`💤 ${user.username} disconnected`);
      await presenceService.setOffline(user.id);
      io.emit("user:offline", { userId: user.id, username: user.username });
    });
  });

  // Prune stale presence entries every minute
  setInterval(async () => {
    const stale = await presenceService.pruneStale();
    stale.forEach((userId) => io.emit("user:offline", { userId }));
  }, 60000);

  return io;
}

module.exports = { initSocket };
