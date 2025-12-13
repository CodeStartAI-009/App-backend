// routes/profile.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET PROFILE
router.get("/me", auth, async (req, res) => {
  try {
    // select safe fields only
    const user = await User.findById(req.user._id).select("-passwordHash -upiHash -bankNumberHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user });
  } catch (err) {
    console.error("Profile GET error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// UPDATE PROFILE
router.patch("/me", auth, async (req, res) => {
  try {
    const {
      name,
      avatarUrl,
      monthlyIncome,
      phone,
      upi,
      bankNumber,
      bankBalance,
      country,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (monthlyIncome !== undefined) user.monthlyIncome = Number(monthlyIncome);
    if (bankBalance !== undefined) user.bankBalance = Number(bankBalance);
    if (phone !== undefined) user.phone = phone;

    /* 🌍 COUNTRY */
    if (country !== undefined) user.country = country;

    if (upi || bankNumber) {
      await user.setSensitiveData({ upi, bankNumber });
    }

    await user.save();

    const safeUser = await User.findById(user._id).select(
      "-passwordHash -upiHash -bankNumberHash"
    );

    res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
});


module.exports = router;
