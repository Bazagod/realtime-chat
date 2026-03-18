const { Message, User, ConversationMember, Conversation } = require("../models");
const { redis, isRedisAvailable } = require("../config/redis");

const CACHE_TTL = 600;

const messageService = {
  async create({ conversationId, senderId, content, type = "text" }) {
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type,
    });

    await Conversation.update(
      { updated_at: new Date() },
      { where: { id: conversationId } }
    );

    if (isRedisAvailable()) {
      await redis.del(`messages:${conversationId}`);
    }

    const full = await Message.findByPk(message.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "username", "avatar_url"] }],
    });

    return full;
  },

  async getRecent(conversationId, limit = 50) {
    if (isRedisAvailable()) {
      const cacheKey = `messages:${conversationId}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const messages = await Message.findAll({
        where: { conversation_id: conversationId },
        order: [["created_at", "DESC"]],
        limit,
        include: [{ model: User, as: "sender", attributes: ["id", "username", "avatar_url"] }],
      });

      const result = messages.reverse();
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    }

    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [["created_at", "DESC"]],
      limit,
      include: [{ model: User, as: "sender", attributes: ["id", "username", "avatar_url"] }],
    });

    return messages.reverse();
  },

  async getConversationMemberIds(conversationId) {
    const members = await ConversationMember.findAll({
      where: { conversation_id: conversationId },
      attributes: ["user_id"],
    });
    return members.map((m) => m.user_id);
  },
};

module.exports = messageService;
