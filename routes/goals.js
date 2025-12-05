// routes/goals.js
const express = require("express");
const auth = require("../middleware/auth");
const Goal = require("../models/Goal");
const Expense = require("../models/Expense");
const User = require("../models/User");

const router = express.Router();

/* ============================================================================
   GET ALL GOALS
============================================================================ */
router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id });
    res.json({ ok: true, goals });
  } catch (err) {
    console.error("GOAL GET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   GET SINGLE GOAL
============================================================================ */
router.get("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) return res.status(404).json({ error: "Goal not found" });

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("GOAL GET SINGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   CREATE GOAL
============================================================================ */
router.post("/create", auth, async (req, res) => {
  try {
    const { title, amount } = req.body;

    if (!title || amount == null)
      return res.status(400).json({ error: "Title & amount required" });

    const goal = await Goal.create({
      userId: req.user._id,
      title,
      amount: Number(amount),
      saved: 0,
      completed: false,
    });

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("GOAL CREATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   ADD SAVINGS TO GOAL  → adds to Expense too
   POST /api/goals/add-saving/:id   body { amount: number }
============================================================================ */
router.post("/add-saving/:id", auth, async (req, res) => {
  try {
    // Defensive read in case req.body is missing
    const body = req.body || {};
    const rawAmount = body.amount;

    if (rawAmount == null)
      return res.status(400).json({ error: "Amount is required in request body" });

    const amount = Number(rawAmount);
    if (Number.isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: "Amount must be a positive number" });

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    const user = await User.findById(req.user._id);

    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Add saving to goal
    goal.saved = Number(goal.saved || 0) + amount;

    // Also log this as an EXPENSE
    await Expense.create({
      userId: req.user._id,
      title: `Saving for ${goal.title}`,
      amount: amount,
      category: "Goal Saving",
    });

    // Deduct from user bank balance (ensure numeric)
    user.bankBalance = Number(user.bankBalance || 0) - amount;

    // If saved >= amount then mark completed
    if (goal.saved >= goal.amount) {
      goal.completed = true;
    }

    await goal.save();
    await user.save();

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("SAVE TO GOAL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   UPDATE GOAL (title, amount)
============================================================================ */
router.put("/update/:id", auth, async (req, res) => {
  try {
    const { title, amount } = req.body;

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    if (title) goal.title = title;
    if (amount != null) goal.amount = Number(amount);

    // Recheck completion
    goal.completed = Number(goal.saved || 0) >= Number(goal.amount || 0);

    await goal.save();

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("GOAL UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   DELETE GOAL
============================================================================ */
router.delete("/delete/:id", auth, async (req, res) => {
    try {
      const goal = await Goal.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });
  
      if (!goal)
        return res.status(404).json({ error: "Goal not found" });
  
      const userId = req.user._id;
  
      // ---------------------------------------------------
      // 1️⃣ Delete all expenses related to this goal
      // ---------------------------------------------------
      const deletedExpenses = await Expense.deleteMany({
        userId,
        title: { $regex: `Saving for ${goal.title}`, $options: "i" }
      });
  
      // ---------------------------------------------------
      // 2️⃣ Delete the Goal
      // ---------------------------------------------------
      await Goal.findByIdAndDelete(goal._id);
  
      // ---------------------------------------------------
      // 3️⃣ Recalculate TOTAL EXPENSE for the user
      // ---------------------------------------------------
      const allExpenses = await Expense.find({ userId });
      const totalExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  
      await User.findByIdAndUpdate(userId, {
        totalExpense,
      });
  
      res.json({
        ok: true,
        message: "Goal deleted along with related expenses",
        removedExpenses: deletedExpenses.deletedCount,
        updatedTotalExpense: totalExpense
      });
  
    } catch (err) {
      console.error("GOAL DELETE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  

module.exports = router;
