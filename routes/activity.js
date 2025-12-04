const express = require("express");
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");

const router = express.Router();

/* -------------------------------------------
   GET TOP 10 RECENT
------------------------------------------- */
router.get("/recent", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
    const incomes = await Income.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();

    const exp = expenses.map((e) => ({ ...e, type: "expense" }));
    const inc = incomes.map((i) => ({ ...i, type: "income" }));

    const recent = [...exp, ...inc]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({ ok: true, recent });
  } catch (err) {
    console.log("RECENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------
   GET ALL TRANSACTIONS (FULL HISTORY)
------------------------------------------- */
router.get("/balance", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const expenses = await Expense.find({ userId }).sort({ createdAt: -1 }).lean();
    const incomes = await Income.find({ userId }).sort({ createdAt: -1 }).lean();

    const exp = expenses.map((e) => ({ ...e, type: "expense" }));
    const inc = incomes.map((i) => ({ ...i, type: "income" }));

    const all = [...exp, ...inc].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ ok: true, activity: all });
  } catch (err) {
    console.log("BALANCE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------
   GET SINGLE TRANSACTION  
------------------------------------------- */
router.get("/single/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Search Income first, then Expense
    let tx =
      (await Income.findById(id).lean()) ||
      (await Expense.findById(id).lean());

    if (!tx) return res.status(404).json({ error: "Not found" });

    tx.type = tx.amount > 0 && tx.source ? "income" : "expense";

    res.json({ ok: true, transaction: tx });
  } catch (err) {
    console.log("SINGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------
   UPDATE TRANSACTION
------------------------------------------- */
router.put("/update/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, type } = req.body;

    const user = await User.findById(req.user._id);

    let old;
    let updated;

    // FIND OLD DATA (income or expense)
    old = await Income.findById(id) || await Expense.findById(id);

    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // REVERSE OLD AMOUNT FROM BALANCE
    if (old.type === "income") user.bankBalance -= old.amount;
    if (old.type === "expense") user.bankBalance += old.amount;

    // UPDATE NEW DATA
    if (type === "income") {
      updated = await Income.findByIdAndUpdate(
        id,
        { title, amount, category },
        { new: true }
      );

      user.bankBalance += amount;
    } else {
      updated = await Expense.findByIdAndUpdate(
        id,
        { title, amount, category },
        { new: true }
      );

      user.bankBalance -= amount;
    }

    await user.save();

    res.json({ ok: true, updated });
  } catch (err) {
    console.log("UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------
   DELETE TRANSACTION
------------------------------------------- */
router.delete("/delete/:type/:id", auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const user = await User.findById(req.user._id);

    let deleted;

    if (type === "expense") {
      deleted = await Expense.findByIdAndDelete(id);
      if (deleted) user.bankBalance += deleted.amount;
    } else if (type === "income") {
      deleted = await Income.findByIdAndDelete(id);
      if (deleted) user.bankBalance -= deleted.amount;
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    await user.save();

    res.json({ ok: true, message: "Deleted", deleted });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
