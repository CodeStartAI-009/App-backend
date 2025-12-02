const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// POST /api/expense/add
router.post("/add", auth, async (req, res) => {
  try {

    let { title, amount, category } = req.body;

    // -----------------------------
    // FIX: Convert amount to Number
    // -----------------------------
    amount = Number(amount);
    if (!title || !category || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Load user
    const user = await User.findById(req.user._id);

    // -----------------------------
    // Generate month key (ex: 2025-12)
    // -----------------------------
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    let monthEntry = user.monthlySummaries.find((m) => m.month === monthKey);

    // If month entry missing → create it
    if (!monthEntry) {
      monthEntry = {
        month: monthKey,
        totalExpense: 0,
        categories: {},
      };
      user.monthlySummaries.push(monthEntry);
    }

    // -----------------------------
    // FIX: Correctly increment totals
    // -----------------------------
    monthEntry.totalExpense += amount;

    if (!monthEntry.categories[category]) {
      monthEntry.categories[category] = 0;
    }
    monthEntry.categories[category] += amount;

    await user.save();

    return res.json({ ok: true, message: "Expense added!" });

  } catch (err) {
    console.error("EXPENSE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
