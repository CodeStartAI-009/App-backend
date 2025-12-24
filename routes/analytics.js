// routes/analytics.js
const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/analytics/events
router.get("/events", auth, async (req, res) => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30); // last 30 days
  
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
        events,
      });
    } catch (err) {
      console.error("EVENT STATS ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
module.exports = router;
