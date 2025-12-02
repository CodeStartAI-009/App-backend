const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

/* ---------------------------------------------
   GET PROFILE
--------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash -upiHash -bankNumberHash");
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/* ---------------------------------------------
   UPDATE PROFILE
--------------------------------------------- */
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, avatarUrl, monthlyIncome, phone, upi, bankNumber } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // BASIC UPDATES
    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;
    if (phone) user.phone = phone;

    // 🔐 HASH UPI + BANK NUMBER (IMPORTANT)
    await user.setSensitiveData({ upi, bankNumber });

    await user.save();

    const safeUser = await User.findById(user._id).select("-passwordHash -upiHash -bankNumberHash");

    res.json({ ok: true, user: safeUser });

  } catch (err) {
    console.log("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
});

module.exports = router;
