// routes/user.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const router = express.Router();

/* ======================================================
   GET USER PROFILE
====================================================== */
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      ok: true,
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,

        country: user.country,
        countryCode: user.countryCode,
        currency: user.currency,

        bankBalance: user.bankBalance || 0,
        monthlyIncome: user.monthlyIncome || 0,

        // ✅ SAFE FLAGS ONLY
        hasUPI: Boolean(user.upiHash),
        hasBankAccount: Boolean(user.bankNumberHash),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   UPDATE NON-SENSITIVE FIELDS (NO PASSWORD)
   - bankBalance
   - monthlyIncome
====================================================== */
router.put("/update-finance", auth, async (req, res) => {
  try {
    const { bankBalance, monthlyIncome } = req.body;

    const update = {};
    if (bankBalance !== undefined) update.bankBalance = bankBalance;
    if (monthlyIncome !== undefined) update.monthlyIncome = monthlyIncome;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

    res.json({
      ok: true,
      bankBalance: user.bankBalance,
      monthlyIncome: user.monthlyIncome
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   UPDATE SENSITIVE FIELDS (REQUIRES PASSWORD)
   - email
   - phone
   - UPI
   - bankAccount
====================================================== */
router.put("/secure-update", auth, async (req, res) => {
  try {
    const { email, phone, upi, bankNumber, password } = req.body;

    if (!password) return res.status(400).json({ error: "Password required" });

    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Incorrect password" });

    if (email) user.email = email;
    if (phone) user.phone = phone;

    // Hash UPI & bank number
    await user.setSensitiveData({ upi, bankNumber });

    await user.save();

    res.json({ ok: true, message: "Details updated successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
router.put("/change-email", auth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    user.email = newEmail;
    await user.save();

    res.json({ ok: true, message: "Email updated" });
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   CHANGE PHONE (REQUIRES PASSWORD)
====================================================== */
router.put("/change-phone", auth, async (req, res) => {
  try {
    const { newPhone, password } = req.body;

    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    user.phone = newPhone;
    await user.save();

    res.json({ ok: true, message: "Phone updated" });
  } catch (err) {
    console.error("PHONE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   CHANGE PASSWORD (requires old password)
====================================================== */
/* ============================================================================
   CHANGE PASSWORD — requires current password
============================================================================ */
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // compare current password
    const correct = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!correct) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    // update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
