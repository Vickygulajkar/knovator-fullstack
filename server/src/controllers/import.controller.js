const jobQueue = require("../queues/job.queue");
const { fetchJobsFromAPI } = require("../services/jobFetcher.service");
const Import = require("../models/Import");
const Job = require("../models/Job");
const ImportLog = require("../models/ImportLog");
const { v4: uuidv4 } = require("uuid");

const FEEDS = [
  {
    url: "https://jobicy.com/?feed=job_feed",
    inputType: "jp1",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time",
    inputType: "jp2",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france",
    inputType: "jp3",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=design-multi-media",
    inputType: "jp4",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=data-science",
    inputType: "jp5",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=copywriting",
    inputType: "jp6",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=business",
    inputType: "jp7",
  },
  {
    url: "https://jobicy.com/?feed=job_feed&job_categories=management",
    inputType: "jp8",
  },
  {
    url: "https://www.higheredjobs.com/rss/articleFeed.cfm",
    inputType: "he1",
  },
];

async function startImportForFeed({ url, inputType }) {
  const data = await fetchJobsFromAPI(url);
  const items = data?.rss?.channel?.item || [];

  if (!items.length) {
    return {
      message: "No jobs found in feed",
      totalFetched: 0,
      importId: null,
    };
  }

  const importId = uuidv4();

  await Import.create({
    importId,
    totalJobs: items.length,
    processedJobs: 0,
    failedJobs: 0,
    status: "processing",
  });

  await ImportLog.create({
    importId,
    fileName: url,
    inputType,
    totalFetched: items.length,
    totalImported: 0,
    newJobs: 0,
    updatedJobs: 0,
    failedJobs: 0,
    failedReasons: [],
  });

  for (const item of items) {
    await jobQueue.add("import-job", {
      importId,
      jobId: item.guid || item.link,
      title: item.title,
      description: item.description,
      category: item.category,
      source: "jobicy", // or derived from URL if needed
      link: item.link,
      publishedAt: item.pubDate,
    });
  }

  return {
    message: "Import started",
    importId,
    totalFetched: items.length,
  };
}

exports.runJobImport = async (req, res) => {
  try {
    const { url, inputType } = req.body || {};

    const feed =
      url && inputType
        ? { url, inputType }
        : FEEDS[0];

    const result = await startImportForFeed(feed);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Import error:", error.message);
    res.status(500).json({
      message: "Job import failed",
      error: error.message,
    });
  }
};

exports.getAllImports = async (req, res) => {
    try {
        const imports = await Import.find().sort({ createdAt: -1 });
        res.json(imports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getImportById = async (req, res) => {
    try {
        const data = await Import.findOne({ importId: req.params.importId });

        if (!data) {
            return res.status(404).json({ message: "Import not found" });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getJobsByImportId = async (req, res) => {
    try {
        const { importId } = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [jobs, total] = await Promise.all([
            Job.find({ importId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Job.countDocuments({ importId }),
        ]);

        res.json({
            page,
            limit,
            totalJobs: total,
            totalPages: Math.ceil(total / limit),
            jobs,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch jobs",
            error: error.message,
        });
    }
};

exports.getImportLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ImportLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ImportLog.countDocuments(),
    ]);

    return res.json({
      page,
      limit,
      totalLogs: total,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (error) {
    console.error("Failed to fetch import logs", error);
    return res.status(500).json({
      message: "Failed to fetch import logs",
      error: error.message,
    });
  }
};

exports.startImportForFeed = startImportForFeed;
exports.FEEDS = FEEDS;

