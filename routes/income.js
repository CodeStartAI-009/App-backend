// routes/income.js
const express = require("express");
const auth = require("../middleware/auth");
const Income = require("../models/Income");
const User = require("../models/User");

const router = express.Router();

/* POST /api/income/add */
router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount, category, date } = req.body;
    amount = Number(amount);
    if (!title || isNaN(amount)) return res.status(400).json({ error: "Invalid input" });

    const created = await Income.create({
      userId: req.user._id,
      title,
      amount,
      category: category || "Income",
      date: date ? new Date(date) : new Date(),
    });

    const user = await User.findById(req.user._id);
    const d = created.date || new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];
    let monthEntry = user.monthlySummaries.find((m) => m.month === monthKey);
    if (!monthEntry) {
      monthEntry = { month: monthKey, totalExpense: 0, totalIncome: 0, categories: {} };
      user.monthlySummaries.push(monthEntry);
    }

    monthEntry.totalIncome = Number(monthEntry.totalIncome || 0) + amount;
    user.bankBalance = Number(user.bankBalance || 0) + amount;

    user.markModified("monthlySummaries");
    await user.save();

    res.json({ ok: true, income: created });
  } catch (err) {
    console.error("Income add error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
