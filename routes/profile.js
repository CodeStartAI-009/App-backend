// routes/profile.js
const express = require("express");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET PROFILE
router.get("/me", auth, async (req, res) => {
  res.json({
    ok: true,
    user: req.user,
  });
});

// UPDATE PROFILE
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, avatarUrl, monthlyIncome, phone, upi, bankNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (monthlyIncome) user.monthlyIncome = monthlyIncome;
    if (phone) user.phone = phone;

    // Hash sensitive fields
    if (upi || bankNumber) {
      await user.setSensitiveData({ upi, bankNumber });
    }

    await user.save();

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed" });
  }
});

module.exports = router;
