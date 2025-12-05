// routes/user.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

/* ------------------------------
   GET USER PROFILE
------------------------------ */
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      ok: true,
      profile: {
        name: user.name,
        username: user.userName,
        email: user.email,
        phone: user.phone || null,

        hasUPI: !!user.upiHash,
        hasBank: !!user.bankNumberHash,

        balance: user.bankBalance || 0,
      }
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------
   UPDATE USER PROFILE
------------------------------ */
router.put("/update", auth, async (req, res) => {
  try {
    const { name, userName, phone, upi, bankNumber } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (userName) user.userName = userName;
    if (phone) user.phone = phone;

    // secure hashing
    await user.setSensitiveData({ upi, bankNumber });

    await user.save();

    res.json({
      ok: true,
      message: "Profile updated successfully"
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
