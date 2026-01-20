const mongoose = require("mongoose");

const importSchema = new mongoose.Schema(
  {
    importId: { type: String, required: true, unique: true },
    totalJobs: { type: Number, default: 0 },
    processedJobs: { type: Number, default: 0 },
    failedJobs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Import", importSchema);
