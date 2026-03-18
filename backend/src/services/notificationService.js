const { Notification } = require("../models");

const notificationService = {
  async create({ userId, type, data }) {
    return Notification.create({ user_id: userId, type, data });
  },

  async getUnread(userId) {
    return Notification.findAll({
      where: { user_id: userId, read: false },
      order: [["created_at", "DESC"]],
      limit: 50,
    });
  },

  async markRead(userId, notificationId) {
    if (notificationId) {
      return Notification.update(
        { read: true },
        { where: { id: notificationId, user_id: userId } }
      );
    }
    return Notification.update({ read: true }, { where: { user_id: userId, read: false } });
  },
};

module.exports = notificationService;
