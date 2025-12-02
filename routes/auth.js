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

/* ============================================================
   JWT Helper
============================================================ */
const createJwt = (payload, exp = config.jwt.expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: exp });
};

/* ============================================================
   SIGNUP
============================================================ */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    if (!password || password.length < 8)
      return res.status(400).json({ error: "Password must be 8+ characters" });

    const emailLower = email.toLowerCase();

    const exists = await User.findOne({ email: emailLower });
    if (exists)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, SALT);

    const user = await User.create({
      name: name || null,
      email: emailLower,
      passwordHash,
    });

    return res.status(201).json({ ok: true, userId: user._id });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   LOGIN
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    console.log("\n====== LOGIN ATTEMPT ======");
    console.log("Incoming:", req.body);

    if (!emailOrPhone || !password)
      return res.status(400).json({ error: "Missing fields" });

    const identifier = emailOrPhone.trim();
    let user = null;

    if (validator.isEmail(identifier)) {
      console.log("Attempting email login:", identifier.toLowerCase());
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      console.log("Attempting phone login:", identifier);
      user = await User.findOne({ phone: identifier });
    }

    if (!user) {
      console.log("❌ NO USER FOUND");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("User found:", user.email);

    const match = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", match);

    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = createJwt({ sub: user._id.toString() });

    console.log("SUCCESS: Token issued");

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("📩 Forgot-password request:", email);

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      console.log("ℹ No user found — silent OK");
      return res.json({ ok: true });
    }

    const otp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(otp, SALT);

    await Otp.create({
      email: emailLower,
      otpHash,
      used: false,
      purpose: "reset",
      expiresAt: new Date(Date.now() + 10 * 60000), // 10 min
    });

    console.log("✔ OTP generated:", otp);

    const html = `
      <p>Your WalletWave OTP:</p>
      <h1 style="font-size:32px;">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `;

    const mailRes = await sendMail(
      emailLower,
      "WalletWave — Password Reset OTP",
      html,
      `Your OTP is ${otp}`
    );

    if (!mailRes.ok) {
      console.log("❌ Mail error:", mailRes.error);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   VERIFY OTP
============================================================ */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ error: "Missing fields" });

    const emailLower = email.toLowerCase();

    const record = await Otp.findOne({
      email: emailLower,
      purpose: "reset",
      used: false,
    }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ error: "Invalid OTP" });
    if (record.expiresAt < new Date())
      return res.status(400).json({ error: "OTP expired" });

    const ok = await bcrypt.compare(String(otp), record.otpHash);
    if (!ok) return res.status(400).json({ error: "Invalid OTP" });

    record.used = true;
    await record.save();

    const resetToken = createJwt({ sub: emailLower, type: "reset" }, "15m");

    return res.json({ ok: true, resetToken });
  } catch (err) {
    console.error("Verify-OTP error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   RESET PASSWORD
============================================================ */
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, email, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "Password must be 8+ chars" });

    let finalEmail = email?.toLowerCase();

    if (resetToken) {
      const payload = jwt.verify(resetToken, config.jwt.secret);
      if (payload.type !== "reset")
        return res.status(400).json({ error: "Invalid token" });

      finalEmail = payload.sub;
    }

    const user = await User.findOne({ email: finalEmail });

    if (!user) return res.status(404).json({ error: "User not found" });

    user.passwordHash = await bcrypt.hash(newPassword, SALT);
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Reset-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
