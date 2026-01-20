const cron = require("node-cron");
const {
  startImportForFeed,
  FEEDS,
} = require("../controllers/import.controller");

cron.schedule("0 * * * *", async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Cron started: job imports for all feeds");
  }

  for (const feed of FEEDS) {
    try {
      const result = await startImportForFeed(feed);
      if (process.env.NODE_ENV !== "production") {
        console.log("Cron import success", {
          url: feed.url,
          inputType: feed.inputType,
          ...result,
        });
      }
    } catch (err) {
      console.error("Cron import failed for feed", feed.url, err.message);
    }
  }
});
