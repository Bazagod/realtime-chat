const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const notificationService = require("../services/notificationService");

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const notifications = await notificationService.getUnread(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.post("/read", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.body;
    await notificationService.markRead(req.user.id, notificationId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications" });
  }
});

module.exports = router;
