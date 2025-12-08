const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const config = require("../config");

// Import routes
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

let isConnected = false;

// Connect to Mongo only once
async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(config.mongoUri);
  isConnected = true;
  console.log("MongoDB connected ✔");
}

module.exports = async (req, res) => {
  await connectDB();

  const app = express();

  app.use(cors({ origin: "*" }));
  app.use(express.json());

  // Register all routes
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/expense", expenseRoutes);
  app.use("/api/income", incomeRoutes);
  app.use("/api/transactions", transactionsRoutes);
  app.use("/api/summary", summaryRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/split", splitRoutes);
  app.use("/api/ai", aiRoutes);

  return app(req, res);
};
