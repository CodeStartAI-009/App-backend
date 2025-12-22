const express = require("express");
const auth = require("../middleware/auth");
const Goal = require("../models/Goal");
const Expense = require("../models/Expense");
const User = require("../models/User");
const { pushAndSave } = require("../utils/pushAndSave");

const router = express.Router();

/* ============================================================================
   GET ALL GOALS
============================================================================ */
router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id });
    res.json({ ok: true, goals });
  } catch (err) {
    console.error("GET GOALS ERROR:", err);
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
    console.error("GET GOAL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   CREATE GOAL
============================================================================ */
router.post("/create", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const { title, amount } = req.body;

    if (!title || amount == null) {
      return res.status(400).json({ error: "Title & amount required" });
    }

    const goal = await Goal.create({
      userId: req.user._id,
      title,
      amount: Number(amount),
      saved: 0,
      completed: false,
    });

    pushAndSave(
      req.user._id,
      "Goal Created",
      `Your goal "${title}" has been created.`,
      io
    );

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("CREATE GOAL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   ADD SAVING TO GOAL (✔ CORRECT WITH YOUR MODELS)
============================================================================ */
router.post("/add-saving/:id", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    const user = await User.findById(req.user._id);

    if (!goal || !user) {
      return res.status(404).json({ error: "Not found" });
    }

    /* 1️⃣ update goal */
    goal.saved += amount;
    goal.completed = goal.saved >= goal.amount;

    /* 2️⃣ create expense (MATCHES Expense schema) */
    await Expense.create({
      userId: req.user._id,
      title: `Saving for ${goal.title}`,
      amount,
      category: "Goal Saving",
      date: new Date(),
    });

    /* 3️⃣ deduct bank balance */
    user.bankBalance = Number(user.bankBalance || 0) - amount;

    await goal.save();
    await user.save();

    /* 4️⃣ notify */
    pushAndSave(
      req.user._id,
      goal.completed ? "Goal Completed" : "Saving Added",
      goal.completed
        ? `🎉 You completed your goal "${goal.title}".`
        : `₹${amount} added to your goal "${goal.title}".`,
      io
    );

    res.json({ ok: true, goal, completed: goal.completed });
  } catch (err) {
    console.error("ADD SAVING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   UPDATE GOAL
============================================================================ */
router.put("/update/:id", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const { title, amount } = req.body;

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) return res.status(404).json({ error: "Goal not found" });

    if (title) goal.title = title;
    if (amount != null) goal.amount = Number(amount);

    goal.completed = goal.saved >= goal.amount;

    await goal.save();

    pushAndSave(
      req.user._id,
      "Goal Updated",
      `Your goal "${goal.title}" has been updated.`,
      io
    );

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("UPDATE GOAL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   DELETE GOAL (✔ FULLY FIXED & SAFE)
============================================================================ */
router.delete("/delete/:id", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const userId = req.user._id;

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId,
    });

    const user = await User.findById(userId);

    if (!goal || !user) {
      return res.status(404).json({ error: "Not found" });
    }

    /* 1️⃣ refund saved amount */
    const refund = Number(goal.saved || 0);
    user.bankBalance = Number(user.bankBalance || 0) + refund;

    /* 2️⃣ delete goal-related expenses */
    await Expense.deleteMany({
      userId,
      category: "Goal Saving",
      title: { $regex: `Saving for ${goal.title}`, $options: "i" },
    });

    /* 3️⃣ delete goal */
    await Goal.findByIdAndDelete(goal._id);

    await user.save();

    /* 4️⃣ notify */
    pushAndSave(
      userId,
      "Goal Deleted",
      `₹${refund} refunded after deleting "${goal.title}".`,
      io
    );

    res.json({
      ok: true,
      refunded: refund,
      message: "Goal deleted and balance restored",
    });
  } catch (err) {
    console.error("DELETE GOAL ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
