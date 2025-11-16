require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

// Correct CORS config (Fixes Expo + Vercel issues)
app.use(cors({
  origin: "*",   // allow all for now (development)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Ensure preflight requests are handled
app.options("*", cors());

// Middleware
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/auth", require("./routes/auth"));

// Root route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Server running
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
