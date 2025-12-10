const express = require("express");
const cors = require("cors");
const config = require("./config");
const connectDB = require("./config/db");
const { runCronJobs } = require("./utils/cronJobs");
// Routes
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

const app = express();

// Connect DB
connectDB();

app.use(express.json());

// CORS
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// API ROUTES
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

// Root
app.get("/", (req, res) => {
  res.send("Backend running ✔");
});

// ❗ FIXED wildcard handler — NO '*' string
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = config.port || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
