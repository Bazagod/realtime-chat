const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const { Message, User, ConversationMember } = require("../models");

const router = Router();

// Get paginated messages for a conversation
router.get("/:conversationId", authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // cursor-based pagination

    // Verify membership
    const member = await ConversationMember.findOne({
      where: { conversation_id: conversationId, user_id: req.user.id },
    });
    if (!member) return res.status(403).json({ error: "Not a member of this conversation" });

    const where = { conversation_id: conversationId };
    if (before) where.created_at = { [require("sequelize").Op.lt]: new Date(before) };

    const messages = await Message.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      include: [{ model: User, as: "sender", attributes: ["id", "username", "avatar_url"] }],
    });

    // Mark conversation as read
    await member.update({ last_read_at: new Date() });

    res.json(messages.reverse());
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

module.exports = router;
