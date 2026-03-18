const { Router } = require("express");
const { User } = require("../models");
const { generateToken, authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

const router = Router();

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(409).json({ error: "Username already taken" });

    const user = await User.create({ username, email, password_hash: password });
    const token = generateToken(user.id);

    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await user.checkPassword(password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user.id);

    await user.update({ is_online: true, last_seen: new Date() });

    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
