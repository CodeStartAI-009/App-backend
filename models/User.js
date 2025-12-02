const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* -------------------------------------------
   MONTHLY SUMMARY SUB-SCHEMA
-------------------------------------------- */
const monthSummarySchema = new mongoose.Schema({
  month: { type: String, required: true },   // "2025-12"
  totalExpense: { type: Number, default: 0 },
  categories: { type: Object, default: {} }, // { Food: 500, Travel: 200 }
});

/* -------------------------------------------
   USER SCHEMA
-------------------------------------------- */
const userSchema = new mongoose.Schema(
  {
    name: String,

    email: { type: String, required: true, unique: true },

    passwordHash: { type: String, required: true },

    avatarUrl: String,

    monthlyIncome: { type: Number, default: 0 },

    phone: String,

    // ****** UPI + BANK NUMBER HASH STORAGE ******
    upiHash: { type: String },          // hashed UPI ID
    bankNumberHash: { type: String },   // hashed bank number

    // ****** MONTHLY SUMMARIES ARRAY ******
    monthlySummaries: [monthSummarySchema],
  },
  { timestamps: true }   // adds createdAt & updatedAt automatically
);

/* --------------------------------------------------------
   METHOD TO SET SENSITIVE DATA (you already used this)
-------------------------------------------------------- */
userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) this.upiHash = await bcrypt.hash(upi, 10);
  if (bankNumber) this.bankNumberHash = await bcrypt.hash(bankNumber, 10);
};

module.exports = mongoose.model("User", userSchema);
