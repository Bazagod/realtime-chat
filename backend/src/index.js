const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const env = require("./config/env");
const { apiLimiter } = require("./middleware/rateLimit");
const { sequelize } = require("./models");
const { connectRedis } = require("./config/redis");
const { initSocket } = require("./services/socketService");

const authRoutes = require("./routes/auth");
const conversationRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected");

    await sequelize.sync({ alter: env.nodeEnv === "development" });
    console.log("✅ Database synced");

    await connectRedis();

    initSocket(server);

    server.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
