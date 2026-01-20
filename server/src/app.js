const express = require("express");
const cors = require("cors");
require("dotenv").config();
const importRoutes = require("./routes/import.routes");
require("./cron/jobImport.cron");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/imports", importRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend running fine" });
});

module.exports = app;
