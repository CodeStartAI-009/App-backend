// routes/profile.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Get current user's profile
router.get("/me", auth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Update profile (display name, bio, avatarUrl)
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, bio, avatarUrl } = req.body;
    const user = await User.findById(req.user._id);
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await user.save();
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
