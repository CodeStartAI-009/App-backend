// routes/analytics.js
const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   POST /api/analytics/event
   Fire-and-forget analytics tracking
===================================================== */
router.post("/event", auth, async (req, res) => {
  try {
    const { event, properties, timestamp } = req.body;
    if (!event) return res.sendStatus(400);

    AnalyticsEvent.create({
      userId: req.user._id,
      event,
      properties: properties || {},
      createdAt: timestamp ? new Date(timestamp) : Date.now(),
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("ANALYTICS TRACK ERROR:", err.message);
    res.sendStatus(200); // ❗ NEVER break UX
  }
});

module.exports = router;
