// server.js (snippet)
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
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB ✔");
  } catch (err) {
    console.error("MongoDB connection failed ❌:", err);
    process.exit(1);
  }
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/summary", summaryRoutes);

app.get("/", (req, res) => res.send("WalletWave backend"));
app.listen(config.port, () => {
  console.log(`Server running → http://localhost:${config.port}`);
});
}
start();