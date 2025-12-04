// routes/expense.js
const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const User = require("../models/User");

const router = express.Router();

/* -----------------------------------------
   POST /api/expense/add
----------------------------------------- */
router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount, category, date } = req.body;

    amount = Number(amount);
    if (!title || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // 1️⃣ Save Expense Document
    const created = await Expense.create({
      userId: req.user._id,
      title,
      amount,
      category: category || "Others",
      date: date ? new Date(date) : new Date(),
    });

    // 2️⃣ Update Monthly Summary + Balance
    const user = await User.findById(req.user._id);

    const d = created.date || new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    // Find index instead of direct reference
    let index = user.monthlySummaries.findIndex((x) => x.month === monthKey);

    // If month does not exist → create
    if (index === -1) {
      user.monthlySummaries.push({
        month: monthKey,
        totalExpense: 0,
        totalIncome: 0,
      });
      index = user.monthlySummaries.length - 1;
    }

    // 3️⃣ Update the expense value (VERY IMPORTANT)
    user.monthlySummaries[index].totalExpense =
      Number(user.monthlySummaries[index].totalExpense || 0) + amount;

    // 4️⃣ Update current bank balance
    user.bankBalance = Number(user.bankBalance || 0) - amount;

    // 5️⃣ Mark modified (must do because monthlySummaries is array)
    user.markModified("monthlySummaries");

    await user.save();

    return res.json({ ok: true, expense: created });
  } catch (err) {
    console.error("Expense add error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
