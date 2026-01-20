const express = require("express");
const router = express.Router();
const {
  runJobImport,
  getAllImports,
  getImportById,
  getJobsByImportId,
  getImportLogs,
} = require("../controllers/import.controller");

router.post("/run", runJobImport);
router.get("/", getAllImports);
router.get("/logs/history", getImportLogs);
router.get("/:importId", getImportById);
router.get("/:importId/jobs", getJobsByImportId);

module.exports = router;
