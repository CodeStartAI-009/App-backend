const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amountToPay: { type: Number, required: true },
});

const splitGroupSchema = new mongoose.Schema({
  title: { type: String, required: true },

  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  creatorUPI: { type: String, required: true },

  participants: [participantSchema],

  isCompleted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SplitGroup", splitGroupSchema);
