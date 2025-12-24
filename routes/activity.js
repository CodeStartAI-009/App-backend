// routes/transactions.js
const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");
const trackServerEvent = require("../utils/trackServerEvent");

const router = express.Router();

/* ----------------------------------------------------
   GET /api/transactions/recent
---------------------------------------------------- */
router.get("/recent", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const incomes = await Income.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const exp = expenses.map((e) => ({ ...e, type: "expense" }));
    const inc = incomes.map((i) => ({ ...i, type: "income" }));

    const recent = [...exp, ...inc]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({ ok: true, recent });
  } catch (err) {
    console.error("RECENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   GET /api/transactions/balance
---------------------------------------------------- */
router.get("/balance", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find(
      { userId },
      "title amount category createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    const incomes = await Income.find(
      { userId },
      "title amount category createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    const exp = expenses.map((e) => ({ ...e, type: "expense" }));
    const inc = incomes.map((i) => ({ ...i, type: "income" }));

    const activity = [...exp, ...inc].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ ok: true, activity });
  } catch (err) {
    console.error("BALANCE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   GET /api/transactions/single/:id
---------------------------------------------------- */
router.get("/single/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    let tx = await Income.findOne({ _id: id, userId: req.user._id }).lean();
    if (tx) return res.json({ ok: true, transaction: { ...tx, type: "income" } });

    tx = await Expense.findOne({ _id: id, userId: req.user._id }).lean();
    if (tx) return res.json({ ok: true, transaction: { ...tx, type: "expense" } });

    res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("SINGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   DELETE /api/transactions/delete/:type/:id
   🔒 SAFE DELETE
---------------------------------------------------- */
router.delete("/delete/:type/:id", auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const previousBalance = Number(user.bankBalance || 0);

    /* ---------------- EXPENSE DELETE ---------------- */
    if (type === "expense") {
      const expense = await Expense.findOne({ _id: id, userId });
      if (!expense) return res.status(404).json({ error: "Not found" });

      // ❌ PROTECT SYSTEM EXPENSES
      if (
        expense.category === "Goal Saving" ||
        expense.category === "split group"
      ) {
        return res.status(403).json({
          error: "This transaction cannot be deleted",
        });
      }

      await Expense.findByIdAndDelete(id);

      const calculatedBalance = previousBalance + Number(expense.amount);
      user.bankBalance = calculatedBalance;
      await user.save();

      trackServerEvent(userId, "transaction_deleted", {
        type: "expense",
        amount: expense.amount,
      });

      // 🔥 integrity check
      if (user.bankBalance !== calculatedBalance) {
        trackServerEvent(userId, "balance_mismatch", {
          expected: calculatedBalance,
          actual: user.bankBalance,
        });
      }

      return res.json({ ok: true, deleted: expense });
    }

    /* ---------------- INCOME DELETE ---------------- */
    if (type === "income") {
      const income = await Income.findOne({ _id: id, userId });
      if (!income) return res.status(404).json({ error: "Not found" });

      await Income.findByIdAndDelete(id);

      const calculatedBalance = previousBalance - Number(income.amount);
      user.bankBalance = calculatedBalance;
      await user.save();

      trackServerEvent(userId, "transaction_deleted", {
        type: "income",
        amount: income.amount,
      });

      if (user.bankBalance !== calculatedBalance) {
        trackServerEvent(userId, "balance_mismatch", {
          expected: calculatedBalance,
          actual: user.bankBalance,
        });
      }

      return res.json({ ok: true, deleted: income });
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
