// routes/aiChat.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const openai = require("../utils/openaiClient");

const COINS_PER_CHAT = 5;
const COINS_PER_AD = 10;
const WEEKLY_BONUS = 15;

/* =========================================================
   Helper: Build user's formatted transaction summary
========================================================= */
async function getUserTransactionSummary(userId, limit = 40) {
  const expenses = await Expense.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  const incomes = await Income.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();

  const merged = [
    ...incomes.map(i => ({
      text: `Income: ${i.title} ₹${i.amount} (${i.category}) on ${i.createdAt.toISOString().slice(0, 10)}`,
      date: i.createdAt,
    })),
    ...expenses.map(e => ({
      text: `Expense: ${e.title} ₹${e.amount} (${e.category}) on ${e.createdAt.toISOString().slice(0, 10)}`,
      date: e.createdAt,
    })),
  ];

  return merged
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50)
    .map(i => i.text)
    .join("\n");
}

/* =========================================================
   POST /api/ai/chat
========================================================= */
router.post("/chat", auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user._id;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if ((user.coins || 0) < COINS_PER_CHAT) {
      return res.status(402).json({ error: "Not enough coins", coins: user.coins });
    }

    const txnSummary = await getUserTransactionSummary(userId);

    const systemPrompt = `
You are a personal finance AI that analyzes THIS USER'S spending.
Give clear, actionable budgeting insights only.

User Transactions:
${txnSummary || "No transactions yet."}

Rules:
- Keep responses simple.
- No medical/legal/adult advice.
`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 400
    });

    const reply = completion.choices?.[0]?.message?.content || 
                  "Sorry, I couldn't generate a response.";

    // Deduct coins AFTER response succeeds
    user.coins -= COINS_PER_CHAT;
    await user.save();

    res.json({ ok: true, reply, coins: user.coins });

  } catch (err) {
    console.error("AI CHAT ERROR:", err);
    res.status(500).json({ error: "AI server error" });
  }
});

/* =========================================================
   POST /api/ai/watch-ad
========================================================= */
router.post("/watch-ad", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.coins += COINS_PER_AD;
    await user.save();
    res.json({ ok: true, coins: user.coins });
  } catch (err) {
    console.error("WATCH AD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================================================
   POST /api/ai/claim-weekly
========================================================= */
router.post("/claim-weekly", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const now = Date.now();
    const last = user.lastWeeklyReward ? user.lastWeeklyReward.getTime() : 0;
    const week = 7 * 24 * 60 * 60 * 1000;

    if (now - last < week) {
      return res.status(400).json({
        error: "Weekly bonus already claimed",
        nextAvailable: new Date(last + week)
      });
    }

    user.coins += WEEKLY_BONUS;
    user.lastWeeklyReward = new Date();
    await user.save();

    res.json({ ok: true, coins: user.coins });

  } catch (err) {
    console.error("WEEKLY BONUS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================================================
   GET /api/ai/coins
========================================================= */
router.get("/coins", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, "coins lastWeeklyReward");
    res.json({
      ok: true,
      coins: user?.coins || 0,
      lastWeeklyReward: user.lastWeeklyReward,
    });
  } catch (err) {
    console.error("COIN FETCH ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
