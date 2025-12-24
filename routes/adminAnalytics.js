// routes/adminAnalytics.js
const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   GET /api/admin/analytics/usage
   DAU / MAU
===================================================== */
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
    console.error("ADMIN ANALYTICS USAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================================
   GET /api/admin/analytics/events
   Event counts (last 30 days)
===================================================== */
router.get("/events", auth, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const events = await AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      ok: true,
      events: events.map((e) => ({
        event: e._id,
        count: e.count,
      })),
    });
  } catch (err) {
    console.error("ADMIN ANALYTICS EVENTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
