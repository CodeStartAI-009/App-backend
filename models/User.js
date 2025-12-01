// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },

    avatarUrl: String,
    monthlyIncome: Number,
    phone: String,

    upiHash: String,
    bankNumberHash: String,
  },
  { timestamps: true }
);

// Hash sensitive fields BEFORE SAVE
userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) this.upiHash = await bcrypt.hash(upi, 10);
  if (bankNumber) this.bankNumberHash = await bcrypt.hash(bankNumber, 10);
};

module.exports = mongoose.model("User", userSchema);
