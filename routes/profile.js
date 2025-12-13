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
      bankBalance,
      phone,
      country,
      countryCode,
      callingCode,
      upi,
      bankNumber,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    /* BASIC FIELDS */
    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (monthlyIncome !== undefined)
      user.monthlyIncome = Number(monthlyIncome);
    if (bankBalance !== undefined)
      user.bankBalance = Number(bankBalance);

    /* 🌍 COUNTRY */
    if (country !== undefined) user.country = country;
    if (countryCode !== undefined)
      user.countryCode = countryCode.toUpperCase();
    if (callingCode !== undefined) user.callingCode = callingCode;

    /* 📞 PHONE VALIDATION (E.164) */
    if (phone !== undefined) {
      const e164Regex = /^\+[1-9]\d{6,14}$/;
      if (!e164Regex.test(phone)) {
        return res.status(400).json({
          error: "Invalid phone number format",
        });
      }

      user.phone = phone;
    }

    /* 🔐 SENSITIVE DATA */
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
