const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { len: [2, 50] },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  last_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

User.prototype.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

User.beforeCreate(async (user) => {
  user.password_hash = await bcrypt.hash(user.password_hash, 12);
});

User.prototype.toSafeJSON = function () {
  const values = this.toJSON();
  delete values.password_hash;
  return values;
};

module.exports = User;
