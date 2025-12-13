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
    name: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: { type: String, required: true },

    agreedToTerms: { type: Boolean, default: false },

    /* 🌍 COUNTRY INFO */
    country: {
      type: String,
      required: true,
      default: "India",
      trim: true,
    },

    countryCode: {
      type: String, // IN, US, GB
      required: true,
      default: "IN",
      uppercase: true,
      trim: true,
    },

    callingCode: {
      type: String, // +91, +1
      required: true,
      default: "+91",
      trim: true,
    },

    /* 💱 CURRENCY */
    currency: {
      type: String, // INR, USD, EUR
      required: true,
      default: "INR",
    },

    avatarUrl: { type: String, default: null },

    bankBalance: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },

    /* 📞 E.164 FORMAT */
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    upiHash: { type: String, default: null },
    bankNumberHash: { type: String, default: null },

    coins: { type: Number, default: 50 },
    lastWeeklyReward: { type: Date, default: null },

    monthlySummaries: [monthSummarySchema],
  },
  { timestamps: true }
);

userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) this.upiHash = await bcrypt.hash(String(upi), 10);
  if (bankNumber)
    this.bankNumberHash = await bcrypt.hash(String(bankNumber), 10);
};

module.exports = mongoose.model("User", userSchema);
