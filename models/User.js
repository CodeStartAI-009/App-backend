// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    // ✅ THIS FIELD WAS THE PROBLEM
    monthlyIncome: {
      type: Number,
      default: 0, // important for dashboard balance
    },

    phone: {
      type: String,
      default: null,
    },

    // Sensitive fields (always hashed)
    upiHash: {
      type: String,
      default: null,
    },

    bankNumberHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hash sensitive data (UPI & bank number) before saving
 */
userSchema.methods.setSensitiveData = async function ({ upi, bankNumber }) {
  if (upi) this.upiHash = await bcrypt.hash(upi, 10);
  if (bankNumber) this.bankNumberHash = await bcrypt.hash(bankNumber, 10);
};

// Prevent returning sensitive data
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.upiHash;
  delete obj.bankNumberHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
