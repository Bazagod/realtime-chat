const { Router } = require("express");
const { Op } = require("sequelize");
const { authenticate } = require("../middleware/auth");
const { User } = require("../models");

const router = Router();

// Search users (for starting new conversations)
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const users = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: req.user.id } },
          {
            [Op.or]: [
              { username: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
            ],
          },
        ],
      },
      attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
      limit: 20,
    });

    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Get online users
router.get("/online", authenticate, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_online: true, id: { [Op.ne]: req.user.id } },
      attributes: ["id", "username", "avatar_url", "is_online", "last_seen"],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

module.exports = router;
