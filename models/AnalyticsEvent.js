const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    event: {
      type: String,
      required: true,
      index: true,
    },

    properties: {
      type: Object,
      default: {},
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

// Compound index for fast queries
analyticsEventSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
