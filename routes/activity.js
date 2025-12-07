 // routes/transactions.js
const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");

const router = express.Router();

/* GET /api/transactions/recent */
router.get("/recent", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
    const incomes = await Income.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();

    const exp = expenses.map((e) => ({ ...e, type: "expense" }));
    const inc = incomes.map((i) => ({ ...i, type: "income" }));
    const recent = [...exp, ...inc].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json({ ok: true, recent });
  } catch (err) {
    console.error("RECENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* GET /api/transactions/balance -> activity (all transactions) */
/* GET /api/transactions/balance -> activity (all transactions) */
// GET /api/transactions/balance → returns full activity (income + expense)
router.get("/balance", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch EXPENSES
    const expenses = await Expense.find(
      { userId },
      "title amount category createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    // Fetch INCOMES
    const incomes = await Income.find(
      { userId },
      "title amount category createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    // Add type: "expense" or "income"
    const exp = expenses.map((e) => ({
      ...e,
      type: "expense",
    }));

    const inc = incomes.map((i) => ({
      ...i,
      type: "income",
    }));

    // Combine + sort newest first
    const activity = [...exp, ...inc].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ ok: true, activity });

  } catch (err) {
    console.error("BALANCE ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* GET single transaction by id */
router.get("/single/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    let tx = await Income.findById(id).lean();
    if (!tx) tx = await Expense.findById(id).lean();
    if (!tx) return res.status(404).json({ error: "Not found" });

    // best guess for type
    tx.type = tx.amount >= 0 ? "income" : "expense";
    res.json({ ok: true, transaction: tx });
  } catch (err) {
    console.error("SINGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* UPDATE transaction (income or expense) */
router.put("/update/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, type } = req.body;
    const user = await User.findById(req.user._id);

    // find in income or expense
    let old = await Income.findById(id);
    let source = "income";
    if (!old) {
      old = await Expense.findById(id);
      source = "expense";
    }
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // reverse old impact on bankBalance and monthly summaries
    const oldAmount = Number(old.amount);
    if (source === "income") user.bankBalance = Number(user.bankBalance || 0) - oldAmount;
    else user.bankBalance = Number(user.bankBalance || 0) + oldAmount;

    // update
    let updated;
    if (type === "income") {
      // if changing type between expense->income or income->income we simplify: delete old and create new if type changed
      if (source === "income") {
        updated = await Income.findByIdAndUpdate(id, { title, amount, category }, { new: true });
      } else {
        // remove expense and create income
        await Expense.findByIdAndDelete(id);
        updated = await Income.create({ userId: req.user._id, title, amount, category });
      }
      user.bankBalance = Number(user.bankBalance || 0) + Number(amount);
    } else {
      // expense
      if (source === "expense") {
        updated = await Expense.findByIdAndUpdate(id, { title, amount, category }, { new: true });
      } else {
        await Income.findByIdAndDelete(id);
        updated = await Expense.create({ userId: req.user._id, title, amount, category });
      }
      user.bankBalance = Number(user.bankBalance || 0) - Number(amount);
    }

    // NOTE: monthlySummaries update is non-trivial (adjust sums). For simplicity we leave month summaries rebuild for a background job OR you can recalc here.
    await user.save();

    res.json({ ok: true, updated });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* DELETE transaction: /delete/:type/:id */
router.delete("/delete/:type/:id", auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const user = await User.findById(req.user._id);

    if (type === "expense") {
      const deleted = await Expense.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Not found" });
      user.bankBalance = Number(user.bankBalance || 0) + Number(deleted.amount);
      // TODO: reduce monthly summary totals similarly
      await user.save();
      return res.json({ ok: true, deleted });
    } else if (type === "income") {
      const deleted = await Income.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Not found" });
      user.bankBalance = Number(user.bankBalance || 0) - Number(deleted.amount);
      await user.save();
      return res.json({ ok: true, deleted });
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
