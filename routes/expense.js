const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Expense = require("../models/Expense");
const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount, category } = req.body;

    amount = Number(amount);
    if (!title || !category || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1️⃣ Save expense in EXPENSES COLLECTION
    await Expense.create({
      userId: req.user._id,
      title,
      amount,
      category
    });

    // 2️⃣ Update user monthly summary
    const user = await User.findById(req.user._id);

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    let monthEntry = user.monthlySummaries.find((m) => m.month === monthKey);

    if (!monthEntry) {
      monthEntry = {
        month: monthKey,
        totalExpense: 0,
        categories: {}
      };
      user.monthlySummaries.push(monthEntry);
    }

    // Update totals
    monthEntry.totalExpense = Number(monthEntry.totalExpense || 0) + amount;

    if (!monthEntry.categories[category]) {
      monthEntry.categories[category] = 0;
    }
    monthEntry.categories[category] += amount;

    // VERY IMPORTANT
    user.markModified("monthlySummaries");

    await user.save();

    return res.json({ ok: true, message: "Expense added!" });

  } catch (err) {
    console.error("EXPENSE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/summary", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // format month key like "2025-12"
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthEntry = (user.monthlySummaries || []).find((m) => m.month === monthKey) || {
      totalExpense: 0,
      categories: {},
    };

    // total expense this month
    const totalExpenseThisMonth = Number(monthEntry.totalExpense || 0);

    // total income - take monthlyIncome field (fallback 0)
    const totalIncome = Number(user.monthlyIncome || 0);

    // diff and type
    const diff = totalIncome - totalExpenseThisMonth;
    const diffType = diff >= 0 ? "saving" : "overspend";

    // top category by amount
    const catObj = monthEntry.categories || {};
    const categories = {};
    Object.keys(catObj).forEach((k) => (categories[k] = Number(catObj[k] || 0)));
    let topCategory = null;
    if (Object.keys(categories).length) {
      topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0];
    }

    // build pastMonths trend (last 6 months)
    const past = (user.monthlySummaries || [])
      .slice()
      .sort((a, b) => (a.month < b.month ? -1 : 1)); // ensure sorted by month string

    // create a map of months -> total
    const monthMap = {};
    past.forEach((m) => (monthMap[m.month] = Number(m.totalExpense || 0)));

    // last 6 months keys (including current)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month: mk, totalExpense: monthMap[mk] || 0 });
    }

    return res.json({
      totalExpenseThisMonth,
      totalIncome,
      diff: Math.abs(Math.round(diff)),
      diffType,
      topCategory,
      categories,
      pastMonths: months, // for line chart
    });
  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
