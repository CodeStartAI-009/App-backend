// routes/adminAnalytics.js
const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   GET /api/admin/analytics/usage
   DAU / WAU / MAU + % change vs yesterday
===================================================== */
router.get("/usage", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(1);

    const dauToday = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: today },
    });

    const dauYesterday = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: yesterday, $lt: today },
    });

    const wau = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: weekStart },
    });

    const mau = await AnalyticsEvent.distinct("userId", {
      createdAt: { $gte: monthStart },
    });

    const dau = dauToday.length;
    const prev = dauYesterday.length || 1;

    const dauChange = Number((((dau - prev) / prev) * 100).toFixed(1));

    res.json({
      ok: true,
      dau,
      wau: wau.length,
      mau: mau.length,
      dauChange,
    });
  } catch (err) {
    console.error("ADMIN USAGE ERROR:", err);
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
    console.error("ADMIN EVENTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================================================
   GET /api/admin/analytics/funnel
   Signup → Expense → Goal
===================================================== */
router.get("/funnel", auth, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const funnelEvents = [
      "user_signup",
      "expense_added",
      "goal_created",
    ];

    const data = await AnalyticsEvent.aggregate([
      {
        $match: {
          event: { $in: funnelEvents },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            event: "$event",
            userId: "$userId",
          },
        },
      },
      {
        $group: {
          _id: "$_id.event",
          users: { $sum: 1 },
        },
      },
    ]);

    const map = {};
    data.forEach((d) => (map[d._id] = d.users));

    res.json({
      ok: true,
      funnel: {
        signup: map.user_signup || 0,
        expense: map.expense_added || 0,
        goal: map.goal_created || 0,
      },
    });
  } catch (err) {
    console.error("FUNNEL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
