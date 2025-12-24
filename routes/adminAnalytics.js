const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

// ⚠️ Optional: add admin-only check later
router.get("/usage", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const dau = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: today },
    });

    const mau = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: monthStart },
    });

    res.json({
      ok: true,
      dau: dau.length,
      mau: mau.length,
    });
  } catch (err) {
    console.error("ADMIN ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
