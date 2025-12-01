// routes/profile.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

/* ----------------------------------------------------------
   GET PROFILE (Protected)
----------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    return res.json({
      ok: true,
      user: req.user, // populated in auth middleware
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------------
   UPDATE PROFILE (Protected)
----------------------------------------------------------- */
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, avatarUrl, monthlyIncome, phone, upi, bankNumber } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Basic profile fields
    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    if (monthlyIncome !== undefined) {
      user.monthlyIncome = Number(monthlyIncome);
    }

    if (phone !== undefined) {
      if (String(phone).length < 10) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      user.phone = phone;
    }

    // Sensitive fields hashing (UPI, Bank Number)
    if (upi !== undefined || bankNumber !== undefined) {
      await user.setSensitiveData({
        upi: upi || user.upi,
        bankNumber: bankNumber || user.bankNumber,
      });
    }

    await user.save();

    return res.json({
      ok: true,
      user,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Profile update failed" });
  }
});

module.exports = router;
