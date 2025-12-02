// middleware/auth.js
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // No header
    if (!authHeader) {
      console.log("❌ No Authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Wrong format
    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ Invalid Authorization format");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (e) {
      console.log("❌ Invalid JWT:", e.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Fetch user
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) {
      console.log("❌ User not found for token:", payload.sub);
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = auth;
