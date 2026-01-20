const mongoose = require("mongoose");

const importLogSchema = new mongoose.Schema(
  {
    importId: {
      type: String,
      index: true,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    inputType: {
      type: String,
      required: true,
    },
    totalFetched: {
      type: Number,
      default: 0,
    },
    totalImported: {
      type: Number,
      default: 0,
    },
    newJobs: {
      type: Number,
      default: 0,
    },
    updatedJobs: {
      type: Number,
      default: 0,
    },
    failedJobs: {
      type: Number,
      default: 0,
    },
    failedReasons: [
      {
        jobId: String,
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ImportLog", importLogSchema);
