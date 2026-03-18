const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ConversationMember = sequelize.define("ConversationMember", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin", "member"),
    defaultValue: "member",
  },
  last_read_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = ConversationMember;
