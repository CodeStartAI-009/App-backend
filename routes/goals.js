// routes/goals.js
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
  const io = req.app.get("io");

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

    // Notify user
    pushAndSave(
      req.user._id,
      "Goal Created",
      `Your new goal "${title}" has been created.`,
      io
    );

    res.json({ ok: true, goal });
  } catch (err) {
    console.error("GOAL CREATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   ADD SAVINGS TO GOAL
============================================================================ */
router.post("/add-saving/:id", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Valid amount required" });

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    const user = await User.findById(req.user._id);

    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update saved amount
    goal.saved += amount;

    // Create Expense log
    await Expense.create({
      userId: req.user._id,
      title: `Saving for ${goal.title}`,
      amount,
      category: "Goal Saving",
    });

    // Deduct from user bank balance
    user.bankBalance = Number(user.bankBalance || 0) - amount;

    // Check goal completion
    if (goal.saved >= goal.amount) {
      goal.completed = true;

      pushAndSave(
        req.user._id,
        "Goal Completed",
        `Congratulations! You completed your goal "${goal.title}".`,
        io
      );
    } else {
      pushAndSave(
        req.user._id,
        "Saving Added",
        `₹${amount} added to your goal "${goal.title}".`,
        io
      );
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
    console.error("GOAL UPDATE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================================
   DELETE GOAL
============================================================================ */
router.delete("/delete/:id", auth, async (req, res) => {
  const io = req.app.get("io");

  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const userId = req.user._id;

    // Remove all related expenses
    await Expense.deleteMany({
      userId,
      title: { $regex: `Saving for ${goal.title}`, $options: "i" },
    });

    // Delete goal
    await Goal.findByIdAndDelete(goal._id);

    pushAndSave(
      userId,
      "Goal Deleted",
      `Your goal "${goal.title}" has been deleted.`,
      io
    );

    res.json({ ok: true, message: "Goal deleted successfully" });
  } catch (err) {
    console.error("GOAL DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
