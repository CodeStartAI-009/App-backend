// routes/income.js
const express = require("express");
const auth = require("../middleware/auth");
const Income = require("../models/Income");
const User = require("../models/User");

const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount, category, date } = req.body;

    amount = Number(amount);
    if (!title || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const entryDate = date ? new Date(date) : new Date();

    // 1️⃣ Create the income
    const created = await Income.create({
      userId: req.user._id,
      title,
      amount,
      category: category || "Income",
      date: entryDate,
    });

    // 2️⃣ Update user monthly summary
    const user = await User.findById(req.user._id);

    const d = created.date;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    let entry = user.monthlySummaries.find((x) => x.month === monthKey);

    if (!entry) {
      entry = { month: monthKey, totalExpense: 0, totalIncome: 0 };
      user.monthlySummaries.push(entry);
    }

    entry.totalIncome += amount;
    user.bankBalance += amount;

    // ⭐ 3️⃣ Daily reward logic
    let reward = false;

    if (!user.lastEntryDate || entryDate > user.lastEntryDate) {
      user.coins = Number(user.coins || 0) + 1;
      reward = true;
    }

    user.lastEntryDate = entryDate;
    user.markModified("monthlySummaries");

    await user.save();

    return res.json({
      ok: true,
      income: created,
      coins: user.coins,
      reward,
    });

  } catch (err) {
    console.error("Income add error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
