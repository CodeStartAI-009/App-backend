// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const monthSummarySchema = new mongoose.Schema({
  month: { type: String, required: true },
  totalExpense: { type: Number, default: 0 },
  totalIncome: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema(
  {
    name: String,
    userName: String,

    email: { type: String, required: true, unique: true },

    passwordHash: { type: String, required: true },

    avatarUrl: String,

    bankBalance: { type: Number, default: 0 },

    monthlyIncome: { type: Number, default: 0 },

    phone: String,

    upiHash: String,
    bankNumberHash: String,

    monthlySummaries: [monthSummarySchema],
  },
  { timestamps: true }
);

// store sensitive UPI / bank
userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) this.upiHash = await bcrypt.hash(String(upi), 10);
  if (bankNumber) this.bankNumberHash = await bcrypt.hash(String(bankNumber), 10);
};

module.exports = mongoose.model("User", userSchema);
