// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config"); 
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);

  app.get("/", (req, res) => {
    res.send("WalletWave backend active ✔ (MongoDB)");
  });

  app.listen(config.port, () => {
    console.log(`Server running → http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
});
