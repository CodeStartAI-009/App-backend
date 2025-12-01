// middleware/auth.js
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized", details: err.message });
  }
}

module.exports = auth;
