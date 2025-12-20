// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const config = require("./config");
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const expenseRoutes = require("./routes/expense");
const incomeRoutes = require("./routes/income");
const transactionsRoutes = require("./routes/activity");
const summaryRoutes = require("./routes/summary");
const userRoutes = require("./routes/user");
const goalRoutes = require("./routes/goals");
const splitRoutes = require("./routes/split"); // UPDATED FOR NOTIFICATIONS
const aiRoutes = require("./routes/aiChat");
const notificationRoutes = require("./routes/notifications");



const app = express();

// DB Connection
connectDB();

// JSON Parser
app.use(express.json());

// CORS
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,PATCH,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// ---------------------------
// HTTP Server + Socket.IO
// ---------------------------
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach IO instance to app → accessible in routes
app.set("io", io);

// Active users map (userId -> socketId)
const users = {};

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Register user to join a private room = userId
  socket.on("register", (userId) => {
    console.log("🔌 Registered User:", userId);
    users[userId] = socket.id;
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    for (const uid in users) {
      if (users[uid] === socket.id) delete users[uid];
    }
  });
});

// ---------------------------
// API ROUTES
// ---------------------------
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/user", userRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/split", splitRoutes); // this now can push notifications
app.use("/api/ai", aiRoutes);
app.use("/notifications", notificationRoutes);
// Root
app.get("/", (req, res) => {
  res.send("Backend running ✔");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------
// START SERVER
// ---------------------------
const PORT = config.port || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
