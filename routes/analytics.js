const express = require("express");
const router = express.Router();
const AnalyticsEvent = require("../models/AnalyticsEvent");
const auth = require("../middleware/auth");

/**
 * POST /api/analytics/event
 * Track analytics event
 */
router.post("/event", auth, async (req, res) => {
  try {
    const { event, properties, timestamp } = req.body;

    if (!event) {
      return res.status(400).json({ error: "Event name required" });
    }

    // Fire-and-forget analytics write
    AnalyticsEvent.create({
      userId: req.user.id,
      event,
      properties: properties || {},
      createdAt: timestamp ? new Date(timestamp) : Date.now(),
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("ANALYTICS ERROR:", err.message);
    return res.sendStatus(200); // ❗ NEVER break app flow
  }
});

module.exports = router;
