const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const jobQueue = new Queue("job-import-queue", {
  connection: redisConnection,
});

module.exports = jobQueue;
