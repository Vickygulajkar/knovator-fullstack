const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        jobId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        importId: {
            type: String,
            index: true,
        },

        title: String,
        description: String,
        category: String,
        source: String,
        link: String,
        publishedAt: String,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Job", jobSchema);
