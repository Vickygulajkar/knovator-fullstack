require("dotenv").config();
const mongoose = require("mongoose");
const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const Job = require("../models/Job");
const Import = require("../models/Import");
const ImportLog = require("../models/ImportLog");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {})
  .catch((err) => {
    console.error("MongoDB worker connection error:", err.message);
  });

const sanitize = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean = {};
  for (const key in obj) {
    const safeKey = key.replace(/\$/g, "").replace(/\./g, "");
    clean[safeKey] = sanitize(obj[key]);
  }
  return clean;
};

const worker = new Worker(
  "job-import-queue",
  async (job) => {
    const rawData = job.data;

    let jobId = rawData.jobId;
    if (typeof jobId === "object" && jobId !== null) {
      jobId = jobId._ || JSON.stringify(jobId);
    }

    const data = sanitize({
      ...rawData,
      jobId,
      importId: rawData.importId,
    });

    try {
      const existing = await Job.findOne({ jobId }).lean();

      if (!existing) {
        await Job.create(data);

        if (data.importId) {
          await Import.updateOne(
            { importId: data.importId },
            { $inc: { processedJobs: 1 } }
          );

          await ImportLog.updateOne(
            { importId: data.importId },
            {
              $inc: {
                totalImported: 1,
                newJobs: 1,
              },
            }
          );
        }
      } else {
        await Job.updateOne({ jobId }, { $set: data });

        if (data.importId) {
          await Import.updateOne(
            { importId: data.importId },
            { $inc: { processedJobs: 1 } }
          );

          await ImportLog.updateOne(
            { importId: data.importId },
            {
              $inc: {
                totalImported: 1,
                updatedJobs: 1,
              },
            }
          );
        }
      }

      if (data.importId) {
        const importDoc = await Import.findOne({ importId: data.importId });

        if (
          importDoc &&
          importDoc.processedJobs + importDoc.failedJobs === importDoc.totalJobs
        ) {
          importDoc.status = "completed";
          await importDoc.save();
        }
      }

      return "Job inserted/updated successfully";
    } catch (error) {
      if (data.importId) {
        await Import.updateOne(
          { importId: data.importId },
          {
            $inc: { failedJobs: 1 },
            $set: { status: "failed" },
          }
        );

        await ImportLog.updateOne(
          { importId: data.importId },
          {
            $inc: { failedJobs: 1 },
            $push: {
              failedReasons: {
                jobId,
                reason: error.message,
              },
            },
          }
        );
      }
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Job ${job.id} completed`);
  }
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`, err.message);
});
