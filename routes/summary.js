const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");

const router = express.Router();

/* ----------------------------------------------------
   1️⃣ SUMMARY FOR THIS MONTH  →  GET /api/summary
----------------------------------------------------- */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

    const expenses = await Expense.find({ userId }).lean();
    const incomes = await Income.find({ userId }).lean();

    let totalExpense = 0;
    let totalIncome = 0;
    let categories = {};

    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (key === monthKey) {
        totalExpense += Number(e.amount);
        const cat = e.category || "Other";
        categories[cat] = (categories[cat] || 0) + Number(e.amount);
      }
    });

    incomes.forEach(i => {
      const d = new Date(i.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (key === monthKey) {
        totalIncome += Number(i.amount);
      }
    });

    res.json({
      ok: true,
      month: monthKey,
      totalExpense,
      totalIncome,
      saving: totalIncome - totalExpense,
      categories
    });
  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ---------------------------------------------------
   2️⃣ ALL MONTH SUMMARIES  ->  /api/summary/monthly
---------------------------------------------------- */
// routes/summary.js
router.get("/monthly", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    const bankBalance = user.bankBalance || 0;

    // current month key
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // fetch all transactions
    const expenses = await Expense.find({ userId }).lean();
    const incomes = await Income.find({ userId }).lean();

    let totalIncome = 0;
    let totalExpense = 0;
    let categories = {};

    // filter only current month expenses
    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (key === monthKey) {
        totalExpense += Number(e.amount);
        const cat = e.category || "Other";
        categories[cat] = (categories[cat] || 0) + Number(e.amount);
      }
    });

    // filter only current month incomes
    incomes.forEach((i) => {
      const d = new Date(i.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (key === monthKey) {
        totalIncome += Number(i.amount);
      }
    });

    // final structure Home.js expects
    const monthlySummaries = [
      {
        month: monthKey,
        totalIncome,
        totalExpense,
      },
    ];

    res.json({
      ok: true,
      bankBalance,
      monthlySummaries,
    });

  } catch (err) {
    console.error("MONTHLY SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   3️⃣ CATEGORY SUMMARY (all time)
----------------------------------------------------- */
router.get("/category", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({ userId }).lean();

    const totals = {};

    expenses.forEach((e) => {
      const cat = e.category || "Other";
      totals[cat] = (totals[cat] || 0) + Number(e.amount || 0);
    });

    res.json({ ok: true, categories: totals });
  } catch (err) {
    console.error("CATEGORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   4️⃣ MONTHLY TREND GRAPH
----------------------------------------------------- */
router.get("/trends", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all transactions
    const expenses = await Expense.find({ userId }).lean();
    const incomes = await Income.find({ userId }).lean();

    const trends = {};

    // Add expense + capture categories
    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (!trends[monthKey]) {
        trends[monthKey] = {
          month: monthKey,
          totalExpense: 0,
          totalIncome: 0,
          categories: {}   // store each category total
        };
      }

      const amt = Number(e.amount || 0);
      const cat = e.category || "Others";

      trends[monthKey].totalExpense += amt;
      trends[monthKey].categories[cat] = (trends[monthKey].categories[cat] || 0) + amt;
    });

    // Add incomes
    incomes.forEach((i) => {
      const d = new Date(i.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (!trends[monthKey]) {
        trends[monthKey] = {
          month: monthKey,
          totalExpense: 0,
          totalIncome: 0,
          categories: {}
        };
      }

      trends[monthKey].totalIncome += Number(i.amount || 0);
    });

    // Build final trend list
    const finalTrend = Object.values(trends)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => {
        // Compute top spending category for each month
        const cats = m.categories || {};
        let topCategory = "None";
        let topAmount = 0;

        Object.entries(cats).forEach(([cat, amt]) => {
          if (amt > topAmount) {
            topCategory = cat;
            topAmount = amt;
          }
        });

        return {
          month: m.month,
          totalExpense: m.totalExpense,
          totalIncome: m.totalIncome,
          topCategory,
          topCategoryAmount: topAmount
        };
      });

    return res.json({ ok: true, trends: finalTrend });
  } catch (err) {
    console.error("TRENDS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
