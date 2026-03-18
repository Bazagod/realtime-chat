const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User } = require("../models");

/**
 * Express middleware — verifies Bearer token and attaches `req.user`.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(decoded.userId);

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Socket.io middleware — same logic, reads token from handshake auth.
 */
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(decoded.userId);
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

function generateToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiry });
}

module.exports = { authenticate, authenticateSocket, generateToken };
