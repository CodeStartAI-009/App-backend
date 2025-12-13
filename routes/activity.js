// routes/transactions.js
const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");

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
   (all activity: income + expense)
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
   ✅ FIXED: Correct type detection
---------------------------------------------------- */
router.get("/single/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    let tx = await Income.findById(id).lean();
    if (tx) {
      return res.json({
        ok: true,
        transaction: { ...tx, type: "income" },
      });
    }

    tx = await Expense.findById(id).lean();
    if (tx) {
      return res.json({
        ok: true,
        transaction: { ...tx, type: "expense" },
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("SINGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   PUT /api/transactions/update/:id
---------------------------------------------------- */
router.put("/update/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, type } = req.body;

    const user = await User.findById(req.user._id);

    let old = await Income.findById(id);
    let source = "income";

    if (!old) {
      old = await Expense.findById(id);
      source = "expense";
    }

    if (!old) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Reverse old balance impact
    const oldAmount = Number(old.amount);
    if (source === "income") {
      user.bankBalance -= oldAmount;
    } else {
      user.bankBalance += oldAmount;
    }

    let updated;

    if (type === "income") {
      if (source === "income") {
        updated = await Income.findByIdAndUpdate(
          id,
          { title, amount, category },
          { new: true }
        );
      } else {
        await Expense.findByIdAndDelete(id);
        updated = await Income.create({
          userId: req.user._id,
          title,
          amount,
          category,
        });
      }
      user.bankBalance += Number(amount);
    } else {
      if (source === "expense") {
        updated = await Expense.findByIdAndUpdate(
          id,
          { title, amount, category },
          { new: true }
        );
      } else {
        await Income.findByIdAndDelete(id);
        updated = await Expense.create({
          userId: req.user._id,
          title,
          amount,
          category,
        });
      }
      user.bankBalance -= Number(amount);
    }

    await user.save();

    res.json({ ok: true, updated });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ----------------------------------------------------
   DELETE /api/transactions/delete/:type/:id
---------------------------------------------------- */
router.delete("/delete/:type/:id", auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const user = await User.findById(req.user._id);

    if (type === "expense") {
      const deleted = await Expense.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Not found" });

      user.bankBalance += Number(deleted.amount);
      await user.save();

      return res.json({ ok: true, deleted });
    }

    if (type === "income") {
      const deleted = await Income.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Not found" });

      user.bankBalance -= Number(deleted.amount);
      await user.save();

      return res.json({ ok: true, deleted });
    }

    res.status(400).json({ error: "Invalid type" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
