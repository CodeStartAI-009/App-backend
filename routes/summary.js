const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const router = express.Router();

/* ---------------------------------------------------
   📌 1. MONTHLY SUMMARY (Used in Breakdown -> Monthly)
---------------------------------------------------- */
router.get("/monthly", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Load user monthly summaries stored in Model
    const user = await User.findById(userId)
      .select("monthlySummaries monthlyIncome bankBalance")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      ok: true,
      monthlySummaries: user.monthlySummaries,
      monthlyIncome: user.monthlyIncome,
      bankBalance: user.bankBalance
    });
  } catch (err) {
    console.log("MONTHLY SUMMARY ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------------------------------
   📌 2. CATEGORY SUMMARY (Used in Breakdown -> Category.js)
      Returns total expense per category (all time)
------------------------------------------------------------------ */
router.get("/category", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ userId }).lean();

    const categoryTotals = {};

    expenses.forEach((exp) => {
      const cat = exp.category || "Others";
      if (!categoryTotals[cat]) categoryTotals[cat] = 0;
      categoryTotals[cat] += exp.amount;
    });

    return res.json({
      ok: true,
      categories: categoryTotals,
    });
  } catch (err) {
    console.log("CATEGORY SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* --------------------------------------------------------------
   📌 3. TRENDS SUMMARY (Used in Breakdown → Trends.js)
      Spending + income trend for last 12 months
--------------------------------------------------------------- */
router.get("/trends", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Load both expenses + incomes
    const expenses = await Expense.find({ userId }).lean();
    const incomes = await Income.find({ userId }).lean();

    const trend = {}; // { "2025-01": { expense: 500, income: 300 }}

    function addRecord(list, type) {
      list.forEach((item) => {
        const d = new Date(item.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        if (!trend[key]) trend[key] = { expense: 0, income: 0 };

        trend[key][type] += item.amount;
      });
    }

    addRecord(expenses, "expense");
    addRecord(incomes, "income");

    // Convert into sorted array
    const sorted = Object.keys(trend)
      .sort()
      .map((month) => ({
        month,
        totalExpense: trend[month].expense,
        totalIncome: trend[month].income,
      }));

    return res.json({ ok: true, trends: sorted });

  } catch (err) {
    console.log("TRENDS SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
