// routes/goals.js
const express = require("express");
const auth = require("../middleware/auth");
const Goal = require("../models/Goal");
const Expense = require("../models/Expense");
const User = require("../models/User");
const { pushAndSave } = require("../utils/pushAndSave");
const trackServerEvent = require("../utils/trackServerEvent");

const router = express.Router();

/* GET ALL GOALS */
router.get("/", auth, async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id });
  res.json({ ok: true, goals });
});

/* CREATE GOAL */
router.post("/create", auth, async (req, res) => {
  const io = req.app.get("io");
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

  trackServerEvent(req.user._id, "goal_created", {
    amount: Number(amount),
  });

  pushAndSave(
    req.user._id,
    "Goal Created",
    `Your goal "${title}" has been created.`,
    io
  );

  res.json({ ok: true, goal });
});

/* ADD SAVING */
router.post("/add-saving/:id", auth, async (req, res) => {
  const io = req.app.get("io");
  const amount = Number(req.body.amount);

  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Valid amount required" });

  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  const user = await User.findById(req.user._id);

  if (!goal || !user)
    return res.status(404).json({ error: "Not found" });

  const previousBalance = Number(user.bankBalance || 0);

  goal.saved += amount;
  const wasCompleted = goal.completed;
  goal.completed = goal.saved >= goal.amount;

  await Expense.create({
    userId: req.user._id,
    title: `Saving for ${goal.title}`,
    amount,
    category: "Goal Saving",
    date: new Date(),
  });

  const calculatedBalance = previousBalance - amount;
  user.bankBalance = calculatedBalance;

  await goal.save();
  await user.save();

  trackServerEvent(req.user._id, "goal_saving_added", { amount });

  if (!wasCompleted && goal.completed) {
    trackServerEvent(req.user._id, "goal_completed", {
      goalId: goal._id,
    });
  }

  if (user.bankBalance !== calculatedBalance) {
    trackServerEvent(req.user._id, "balance_mismatch", {
      expected: calculatedBalance,
      actual: user.bankBalance,
    });
  }

  pushAndSave(
    req.user._id,
    goal.completed ? "Goal Completed" : "Saving Added",
    goal.completed
      ? `🎉 You completed your goal "${goal.title}".`
      : `₹${amount} added to your goal "${goal.title}".`,
    io
  );

  res.json({ ok: true, goal, completed: goal.completed });
});

/* DELETE GOAL */
router.delete("/delete/:id", auth, async (req, res) => {
  const io = req.app.get("io");
  const userId = req.user._id;

  const goal = await Goal.findOne({ _id: req.params.id, userId });
  const user = await User.findById(userId);

  if (!goal || !user)
    return res.status(404).json({ error: "Not found" });

  const refund = Number(goal.saved || 0);
  user.bankBalance = Number(user.bankBalance || 0) + refund;

  await Expense.deleteMany({
    userId,
    category: "Goal Saving",
    title: { $regex: `Saving for ${goal.title}`, $options: "i" },
  });

  await Goal.findByIdAndDelete(goal._id);
  await user.save();

  trackServerEvent(userId, "goal_deleted", { refund });

  pushAndSave(
    userId,
    "Goal Deleted",
    `₹${refund} refunded after deleting "${goal.title}".`,
    io
  );

  res.json({ ok: true, refunded: refund });
});

module.exports = router;
