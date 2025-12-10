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
const SALT_ROUNDS = 10;

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */
function createJwt(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/* ---------------------------------------------
   🔥 TEST / PING ROUTE  (IMPORTANT)
---------------------------------------------- */
router.get("/test", (req, res) => {
  return res.json({ ok: true, message: "Auth API working" });
});

router.get("/ping", (req, res) => {
  return res.json({ ok: true, time: Date.now() });
});

/* ---------------------------------------------
   SIGNUP
---------------------------------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, agreedToTerms } = req.body;

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    if (!password || password.length < 8)
      return res.status(400).json({ error: "Password must be 8+ characters" });

    if (!agreedToTerms)
      return res.status(400).json({ error: "You must agree to Terms & Conditions" });

    const emailLower = email.toLowerCase();

    const existing = await User.findOne({ email: emailLower });
    if (existing)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name || null,
      email: emailLower,
      passwordHash,
      agreedToTerms: true,
    });

    const token = createJwt({ sub: user._id.toString() });

    return res.status(201).json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        agreedToTerms: user.agreedToTerms,
        coins: 40
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ------------------- LOGIN ------------------- */
router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password)
      return res.status(400).json({ error: "Missing fields" });

    let user = null;
    const identifier = String(emailOrPhone);

    if (validator.isEmail(identifier))
      user = await User.findOne({ email: identifier.toLowerCase() });
    else
      user = await User.findOne({ phone: identifier });

    if (!user)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = createJwt({ sub: user._id.toString() });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
        agreedToTerms: user.agreedToTerms,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------
   FORGOT PASSWORD → SEND OTP
---------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "Valid email required" });

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });

    // Privacy: always return ok
    if (!user) return res.json({ ok: true });

    const plainOtp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(plainOtp, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60000);

    await Otp.create({
      email: emailLower,
      otpHash,
      purpose: "reset",
      expiresAt,
      used: false,
    });

    const html = `
      <p>Your WalletWave password reset code:</p>
      <h2>${plainOtp}</h2>
      <p>Expires in ${config.otpExpiryMinutes} minutes</p>
    `;

    await sendMail(emailLower, "Password Reset OTP", html);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------
   VERIFY OTP
---------------------------------------------- */
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

    if (!record)
      return res.status(400).json({ error: "Invalid or expired OTP" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ error: "OTP expired" });

    const ok = await bcrypt.compare(String(otp), record.otpHash);
    if (!ok)
      return res.status(400).json({ error: "Invalid OTP" });

    record.used = true;
    await record.save();

    const resetToken = jwt.sign(
      { sub: emailLower, type: "reset" },
      config.jwt.secret,
      { expiresIn: "15m" }
    );

    return res.json({ ok: true, resetToken });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------
   RESET PASSWORD
---------------------------------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, email, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "Password must be 8+ chars" });

    let targetEmail = email ? email.toLowerCase() : null;

    if (resetToken) {
      try {
        const payload = jwt.verify(resetToken, config.jwt.secret);
        if (payload.type !== "reset") throw new Error("Invalid token");
        targetEmail = payload.sub;
      } catch (err) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
    }

    if (!targetEmail)
      return res.status(400).json({ error: "Missing email" });

    const user = await User.findOne({ email: targetEmail });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Reset-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
