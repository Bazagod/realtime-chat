const { redis, isRedisAvailable } = require("../config/redis");
const { User } = require("../models");

const ONLINE_KEY = "online_users";
const TTL = 300;

const presenceService = {
  async setOnline(userId) {
    if (isRedisAvailable()) {
      await redis.zadd(ONLINE_KEY, Date.now(), userId);
    }
    await User.update({ is_online: true, last_seen: new Date() }, { where: { id: userId } });
  },

  async setOffline(userId) {
    if (isRedisAvailable()) {
      await redis.zrem(ONLINE_KEY, userId);
    }
    await User.update({ is_online: false, last_seen: new Date() }, { where: { id: userId } });
  },

  async isOnline(userId) {
    if (isRedisAvailable()) {
      const score = await redis.zscore(ONLINE_KEY, userId);
      return score !== null;
    }
    const user = await User.findByPk(userId, { attributes: ["is_online"] });
    return user?.is_online || false;
  },

  async getOnlineUsers() {
    if (isRedisAvailable()) {
      return redis.zrangebyscore(ONLINE_KEY, Date.now() - TTL * 1000, "+inf");
    }
    const users = await User.findAll({ where: { is_online: true }, attributes: ["id"] });
    return users.map((u) => u.id);
  },

  async heartbeat(userId) {
    if (isRedisAvailable()) {
      await redis.zadd(ONLINE_KEY, Date.now(), userId);
    }
  },

  async pruneStale() {
    if (!isRedisAvailable()) return [];
    const cutoff = Date.now() - TTL * 1000;
    const stale = await redis.zrangebyscore(ONLINE_KEY, "-inf", cutoff);
    if (stale.length) {
      await redis.zremrangebyscore(ONLINE_KEY, "-inf", cutoff);
      await User.update(
        { is_online: false, last_seen: new Date() },
        { where: { id: stale } }
      );
    }
    return stale;
  },
};

module.exports = presenceService;
