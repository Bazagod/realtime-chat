const { Router } = require("express");
const { Op } = require("sequelize");
const { authenticate } = require("../middleware/auth");
const {
  User,
  Conversation,
  ConversationMember,
  Message,
} = require("../models");

const router = Router();

// List conversations for the authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
          through: { attributes: ["role", "last_read_at"] },
        },
      ],
      where: {
        id: {
          [Op.in]: await ConversationMember.findAll({
            where: { user_id: req.user.id },
            attributes: ["conversation_id"],
          }).then((rows) => rows.map((r) => r.conversation_id)),
        },
      },
      order: [["updated_at", "DESC"]],
    });

    // Attach last message to each conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({
          where: { conversation_id: conv.id },
          order: [["created_at", "DESC"]],
          include: [{ model: User, as: "sender", attributes: ["id", "username"] }],
        });

        const unread = await Message.count({
          where: {
            conversation_id: conv.id,
            created_at: {
              [Op.gt]: await ConversationMember.findOne({
                where: { conversation_id: conv.id, user_id: req.user.id },
              }).then((m) => m?.last_read_at || new Date(0)),
            },
            sender_id: { [Op.ne]: req.user.id },
          },
        });

        return { ...conv.toJSON(), lastMessage, unreadCount: unread };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// Create a private conversation (or return existing one)
router.post("/private", authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot create conversation with yourself" });
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const { sequelize } = require("../models");
    const [rows] = await sequelize.query(`
      SELECT cm1.conversation_id
      FROM conversation_members cm1
      JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      JOIN conversations c ON c.id = cm1.conversation_id
      WHERE cm1.user_id = :userId1
        AND cm2.user_id = :userId2
        AND c.type = 'private'
      LIMIT 1
    `, {
      replacements: { userId1: req.user.id, userId2: userId },
    });

    if (rows.length > 0) {
      const found = await Conversation.findByPk(rows[0].conversation_id, {
        include: [{
          model: User,
          as: "members",
          attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
          through: { attributes: ["role", "last_read_at"] },
        }],
      });
      return res.json(found);
    }

    const conversation = await Conversation.create({
      type: "private",
      created_by: req.user.id,
    });

    await ConversationMember.bulkCreate([
      { conversation_id: conversation.id, user_id: req.user.id, role: "admin" },
      { conversation_id: conversation.id, user_id: userId, role: "member" },
    ]);

    const full = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
          through: { attributes: ["role"] },
        },
      ],
    });

    res.status(201).json(full);
  } catch (err) {
    console.error("Create private conversation error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Create a group conversation
router.post("/group", authenticate, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });
    if (!memberIds || memberIds.length < 1) {
      return res.status(400).json({ error: "At least one other member is required" });
    }

    const allMemberIds = [...new Set([req.user.id, ...memberIds])];

    const conversation = await Conversation.create({
      type: "group",
      name,
      created_by: req.user.id,
    });

    await ConversationMember.bulkCreate(
      allMemberIds.map((uid) => ({
        conversation_id: conversation.id,
        user_id: uid,
        role: uid === req.user.id ? "admin" : "member",
      }))
    );

    // System message
    await Message.create({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      content: `${req.user.username} created the group "${name}"`,
      type: "system",
    });

    const full = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
          through: { attributes: ["role"] },
        },
      ],
    });

    res.status(201).json(full);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

module.exports = router;
