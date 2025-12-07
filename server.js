// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const expenseRoutes = require("./routes/expense");
const incomeRoutes = require("./routes/income");
const transactionsRoutes = require("./routes/activity");
const summaryRoutes = require("./routes/summary");
const userRoutes = require("./routes/user");
const goalRoutes = require("./routes/goals");
const splitRoutes = require("./routes/split");
const aiRoutes = require("./routes/aiChat");

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB ✔");
  } catch (err) {
    console.error("MongoDB connection failed ❌:", err);
    process.exit(1);
  }

  const app = express();

  // CORS - required for iOS simulator
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());

  // API ROUTES
  app.use("/api/ai", aiRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/expense", expenseRoutes);
  app.use("/api/income", incomeRoutes);
  app.use("/api/transactions", transactionsRoutes);
  app.use("/api/summary", summaryRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/split", splitRoutes);

  // TEST ROOT
  app.get("/", (req, res) => res.send("WalletWave backend running ✔"));

  // START SERVER
  app.listen(config.port, () => {
    console.log(`🚀 Server running → http://localhost:${config.port}`);
  });
}

start();
