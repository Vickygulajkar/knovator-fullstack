const app = require("./src/app");
const connectDB = require("./src/config/db");
require("dotenv").config();
const redis = require("./src/config/redis");

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Server running on port ${PORT}`);
    console.log("Redis status:", redis.status);
  }
});
