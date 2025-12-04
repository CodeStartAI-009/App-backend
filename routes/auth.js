// routes/auth.js
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

/**
 * createJwt(payload, expiresIn)
 */
function createJwt(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}
function generateUsername(name) {
  const base = name.toLowerCase().replace(/\s+/g, "");
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100 + Math.random() * 900); // 3-digit
  return `${base}${year}${random}`;
}

/* ---------------------------
   SIGNUP
---------------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    const emailLower = email.toLowerCase();
    if (await User.findOne({ email: emailLower }))
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);

    const userName = generateUsername(name || "user");

    const user = await User.create({
      name,
      userName,
      email: emailLower,
      passwordHash,
    });

    const token = createJwt({ sub: user._id });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        monthlyIncome: user.monthlyIncome,
        bankBalance: user.bankBalance,
      },
    });
  } catch (err) {
    console.log("SIGNUP ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


/* ---------------------------
   LOGIN
---------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    console.log("LOGIN attempt:", req.body);

    if (!emailOrPhone || !password)
      return res.status(400).json({ error: "Missing fields" });

    const identifier = String(emailOrPhone).trim();
    let user = null;

    if (validator.isEmail(identifier)) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      user = await User.findOne({ phone: identifier });
    }

    if (!user) {
      console.log("NO USER FOUND for:", identifier);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.log("Password mismatch for:", user.email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createJwt({ sub: user._id.toString() });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
        monthlyIncome: user.monthlyIncome || 0,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------
   FORGOT PASSWORD -> SEND OTP
---------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Forgot-password request:", email);

    if (!email || !validator.isEmail(String(email)))
      return res.status(400).json({ error: "Valid email required" });

    const emailLower = String(email).toLowerCase();
    const user = await User.findOne({ email: emailLower });

    // Privacy: always return ok (do not leak whether email exists)
    if (!user) {
      console.log("Email not registered - returning OK (privacy).");
      return res.json({ ok: true });
    }

    const plainOtp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(String(plainOtp), SALT);
    const expiresAt = new Date(Date.now() + (config.otpExpiryMinutes || 10) * 60 * 1000);

    await Otp.create({
      email: emailLower,
      otpHash,
      used: false,
      purpose: "reset",
      expiresAt,
    });

    const html = `<p>Your WalletWave password reset code is:</p><h2>${plainOtp}</h2><p>This code expires in ${config.otpExpiryMinutes || 10} minutes.</p>`;

    const mailRes = await sendMail(emailLower, "WalletWave Password Reset OTP", html, `Your OTP: ${plainOtp}`);

    if (!mailRes.ok) {
      console.error("Mail send failed:", mailRes.error);
      // still return ok to not leak
    } else {
      console.log("OTP mailed to:", emailLower);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------
   VERIFY OTP
---------------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Missing fields" });

    const emailLower = String(email).toLowerCase();

    const record = await Otp.findOne({
      email: emailLower,
      purpose: "reset",
      used: false,
    }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ error: "Invalid or expired OTP" });
    if (record.expiresAt && record.expiresAt < new Date())
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

/* ---------------------------
   RESET PASSWORD
---------------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, email, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "Password must be 8+ chars" });

    let targetEmail = email ? String(email).toLowerCase() : null;

    if (resetToken) {
      try {
        const payload = jwt.verify(resetToken, config.jwt.secret);
        if (payload.type !== "reset") throw new Error("Invalid token type");
        targetEmail = payload.sub;
      } catch (e) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
    }

    if (!targetEmail) return res.status(400).json({ error: "Missing email or token" });

    const user = await User.findOne({ email: targetEmail });
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
