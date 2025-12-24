// routes/analytics.js
const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

const router = express.Router();

/* ---------------------------------------------
   POST /api/analytics/event
---------------------------------------------- */
router.post("/event", auth, async (req, res) => {
  try {
    const { event, properties, timestamp } = req.body;

    if (!event) return res.sendStatus(400);

    // Fire-and-forget write
    AnalyticsEvent.create({
      userId: req.user._id,
      event,
      properties: properties || {},
      createdAt: timestamp ? new Date(timestamp) : Date.now(),
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("ANALYTICS ERROR:", err.message);
    // ❗ never block app
    res.sendStatus(200);
  }
});

module.exports = router;
