// middleware/auth.js
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(payload.sub).select("-passwordHash -upiHash -bankNumberHash");
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = auth;
