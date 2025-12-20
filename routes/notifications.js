const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const Notification = require("../models/Notification");
const User = require("../models/User");

/* ---------------- SAVE EXPO TOKEN ---------------- */
router.post("/save-token", auth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ ok: true });

  await User.findByIdAndUpdate(req.user._id, {
    expoPushToken: token,
  });

  res.json({ ok: true });
});

/* ---------------- GET NOTIFICATIONS ---------------- */
router.get("/", auth, async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    ok: true,
    notifications,
  });
});

/* ---------------- MARK ALL AS READ ---------------- */
router.post("/mark-read", auth, async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  await User.findByIdAndUpdate(req.user._id, {
    unreadCount: 0,
  });

  res.json({ ok: true });
});

module.exports = router;
