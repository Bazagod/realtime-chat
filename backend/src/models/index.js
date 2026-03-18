const sequelize = require("../config/database");
const User = require("./User");
const Conversation = require("./Conversation");
const ConversationMember = require("./ConversationMember");
const Message = require("./Message");
const Notification = require("./Notification");

/*
 * ── Associations ────────────────────────────────────────────
 * Sequelize associations define how models relate to each other.
 * Using a many-to-many through table (ConversationMember) allows
 * flexible group membership and role tracking.
 */

// User <-> Conversation (many-to-many via ConversationMember)
User.belongsToMany(Conversation, {
  through: ConversationMember,
  foreignKey: "user_id",
  otherKey: "conversation_id",
  as: "conversations",
});
Conversation.belongsToMany(User, {
  through: ConversationMember,
  foreignKey: "conversation_id",
  otherKey: "user_id",
  as: "members",
});

// Conversation -> Messages
Conversation.hasMany(Message, { foreignKey: "conversation_id", as: "messages" });
Message.belongsTo(Conversation, { foreignKey: "conversation_id" });

// User -> Messages
User.hasMany(Message, { foreignKey: "sender_id", as: "sentMessages" });
Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

// User -> Notifications
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "user_id" });

// Conversation creator
Conversation.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ConversationMember direct access
ConversationMember.belongsTo(User, { foreignKey: "user_id" });
ConversationMember.belongsTo(Conversation, { foreignKey: "conversation_id" });

module.exports = {
  sequelize,
  User,
  Conversation,
  ConversationMember,
  Message,
  Notification,
};
