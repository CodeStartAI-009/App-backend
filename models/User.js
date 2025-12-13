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

    /* 🌍 COUNTRY */
    country: {
      type: String,
      required: true,
      trim: true,
      default: "India", // safe default for existing users
    },

    avatarUrl: { type: String, default: null },

    bankBalance: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },

    phone: { type: String, trim: true },

    upiHash: { type: String, default: null },
    bankNumberHash: { type: String, default: null },

    coins: { type: Number, default: 50 },
    lastWeeklyReward: { type: Date, default: null },

    monthlySummaries: [monthSummarySchema],
  },
  { timestamps: true }
);
