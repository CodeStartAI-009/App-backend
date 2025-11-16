require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

// CORS (Works for Expo Web + Mobile)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body parser
app.use(express.json());

// Connect database
connectDB();

// Routes
app.use("/auth", require("./routes/auth"));

// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
