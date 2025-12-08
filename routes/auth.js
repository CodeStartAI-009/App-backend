const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const config = require("../config");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { generateNumericOtp } = require("../utils/generateOtp");
const { sendMail } = require("../utils/mailer");

const router = express.Router();
const SALT = 10;

/* ---------------------------------------
   JWT Helper
---------------------------------------- */
function createJwt(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/* ---------------------------------------
   Signup
---------------------------------------- */
router.post("/signup", async (req, res) => {
  console.log("📩 SIGNUP BODY:", req.body);

  try {
    const { name, email, password } = req.body;

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    if (!password || password.length < 8)
      return res.status(400).json({ error: "Password must be 8+ characters" });

    if (!name || name.length < 2)
      return res.status(400).json({ error: "Name is required" });

    const emailLower = email.toLowerCase();

    if (await User.findOne({ email: emailLower }))
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, SALT);

    const user = await User.create({
      name,
      email: emailLower,
      passwordHash,
      coins: 50,
    });

    const token = createJwt({ sub: user._id });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("❌ SIGNUP ERROR:", err.stack || err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------
   LOGIN
---------------------------------------- */
router.post("/login", async (req, res) => {
  console.log("📩 LOGIN BODY:", req.body);

  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password)
      return res.status(400).json({ error: "Missing fields" });

    const identifier = String(emailOrPhone).trim().toLowerCase();

    let user = validator.isEmail(identifier)
      ? await User.findOne({ email: identifier })
      : await User.findOne({ phone: identifier });

    if (!user) {
      console.log("❌ User not found:", identifier);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.log("❌ Password incorrect:", identifier);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createJwt({ sub: user._id });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err.stack || err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
