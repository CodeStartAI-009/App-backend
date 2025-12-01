// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config"); // loads config/index.js
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

async function start() {
  try {
    // Connect MongoDB
    await mongoose.connect(config.mongoUri, {
      // Mongoose v7 defaults are fine; explicit options kept for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);

  app.get("/", (req, res) => res.send("WalletWave backend (MongoDB)"));

  app.listen(config.port, () => console.log(`Server started on http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
