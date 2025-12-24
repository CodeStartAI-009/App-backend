const AnalyticsEvent = require("../models/AnalyticsEvent");

const trackServerEvent = async (userId, event, properties = {}) => {
  try {
    if (!userId || !event) return;

    AnalyticsEvent.create({
      userId,
      event,
      properties,
    });
  } catch (err) {
    // Silent fail
  }
};

module.exports = trackServerEvent;
