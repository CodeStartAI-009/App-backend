const express = require("express");
const cors = require("cors");
const config = require("../config");
const connectDB = require("../config/db");

// Import routes correctly
const authRoutes = require("../routes/auth");
const profileRoutes = require("../routes/profile");
const expenseRoutes = require("../routes/expense");
const incomeRoutes = require("../routes/income");
const transactionsRoutes = require("../routes/activity");
const summaryRoutes = require("../routes/summary");
const userRoutes = require("../routes/user");
const goalRoutes = require("../routes/goals");
const splitRoutes = require("../routes/split");
const aiRoutes = require("../routes/aiChat");

// Prevent re-creating Express app for each request
let app;
let dbConnected = false;

module.exports = async function handler(req, res) {
  try {
    // Connect DB once per cold start
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }

    // Create app only once
    if (!app) {
      app = express();

      app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE"],
          allowedHeaders: ["Content-Type", "Authorization"],
        })
      );

      app.use(express.json());

      // ROUTES
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

      // Default route
      app.get("/", (req, res) => res.send("WalletWave Backend running ✔"));
    }

    return app(req, res);

  } catch (err) {
    console.error("❌ Serverless handler error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
