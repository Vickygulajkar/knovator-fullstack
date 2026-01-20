const IORedis = require("ioredis");

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Redis connected");
  }
});

redisConnection.on("ready", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Redis ready");
  }
});

redisConnection.on("error", (err) => {
  console.error("Redis error:", err.message);
});

module.exports = redisConnection;
