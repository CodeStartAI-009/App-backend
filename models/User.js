const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const monthSummarySchema = new mongoose.Schema({
  month: { type: String, required: true },
  totalExpense: { type: Number, default: 0 },
  totalIncome: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    userName: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: { type: String, required: true },

    /* AGREEMENT */
    agreedToTerms: { type: Boolean, default: false },

    /* APP CREDITS */
    coins: { type: Number, default: 50 },
    lastWeeklyReward: { type: Date, default: null },

    avatarUrl: { type: String, default: null },

    bankBalance: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },

    phone: { type: String, trim: true },

    upiHash: { type: String, default: null },
    bankNumberHash: { type: String, default: null },

    monthlySummaries: [monthSummarySchema],
  },
  { timestamps: true }
);

userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) {
    this.upiHash = await bcrypt.hash(String(upi), 10);
  }
  if (bankNumber) {
    this.bankNumberHash = await bcrypt.hash(String(bankNumber), 10);
  }
};

module.exports = mongoose.model("User", userSchema);
