// models/Goal.js
const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  title: { type: String, required: true },

  amount: { type: Number, required: true },   // Target amount
  saved: { type: Number, default: 0 },        // How much saved
  completed: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("Goal", goalSchema);
