const Redis = require("ioredis");
const env = require("./env");

const redisOptions = {
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

const redis = new Redis(env.redisUrl, redisOptions);
const pub = new Redis(env.redisUrl, redisOptions);
const sub = new Redis(env.redisUrl, redisOptions);

let redisAvailable = false;

redis.on("error", (err) => {
  if (redisAvailable) console.error("Redis client error:", err.message);
  redisAvailable = false;
});
redis.on("connect", () => {
  redisAvailable = true;
  console.log("✅ Redis connected");
});

pub.on("error", () => {});
sub.on("error", () => {});

async function connectRedis() {
  try {
    await redis.connect();
    await pub.connect();
    await sub.connect();
    redisAvailable = true;
    return true;
  } catch (err) {
    console.warn("⚠️  Redis not available, running without caching/pub-sub:", err.message);
    redisAvailable = false;
    return false;
  }
}

function isRedisAvailable() {
  return redisAvailable;
}

module.exports = { redis, pub, sub, connectRedis, isRedisAvailable };
