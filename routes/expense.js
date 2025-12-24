// routes/expense.js
const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const User = require("../models/User");
const trackServerEvent = require("../utils/trackServerEvent");

const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount, category, date } = req.body;
    amount = Number(amount);

    if (!title || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1️⃣ Create expense
    const created = await Expense.create({
      userId: req.user._id,
      title,
      amount,
      category: category || "Others",
      date: date ? new Date(date) : new Date(),
    });

    // 2️⃣ Load user
    const user = await User.findById(req.user._id);
    const previousBalance = Number(user.bankBalance || 0);

    const d = created.date;
    const monthKey = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    let index = user.monthlySummaries.findIndex((x) => x.month === monthKey);
    if (index === -1) {
      user.monthlySummaries.push({
        month: monthKey,
        totalExpense: 0,
        totalIncome: 0,
      });
      index = user.monthlySummaries.length - 1;
    }

    user.monthlySummaries[index].totalExpense =
      Number(user.monthlySummaries[index].totalExpense || 0) + amount;

    const calculatedBalance = previousBalance - amount;
    user.bankBalance = calculatedBalance;

    user.markModified("monthlySummaries");
    await user.save();

    // 🔥 analytics
    trackServerEvent(req.user._id, "expense_added", {
      amount,
      category: category || "Others",
    });

    // 🔥 balance integrity check
    if (user.bankBalance !== calculatedBalance) {
      trackServerEvent(req.user._id, "balance_mismatch", {
        expected: calculatedBalance,
        actual: user.bankBalance,
      });
    }

    return res.json({ ok: true, expense: created });
  } catch (err) {
    console.error("Expense add error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
