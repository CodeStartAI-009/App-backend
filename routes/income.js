const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Income = require("../models/Income");

const router = express.Router();

router.post("/add", auth, async (req, res) => {
  try {
    let { title, amount } = req.body;

    amount = Number(amount);

    if (!title || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // SAVE TEMPORARY INCOME ENTRY
    await Income.create({
      userId: req.user._id,
      title,
      amount
    });

    const user = await User.findById(req.user._id);

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (!user.monthlySummaries) user.monthlySummaries = [];

    let monthEntry = user.monthlySummaries.find(m => m.month === monthKey);

    if (!monthEntry) {
      monthEntry = {
        month: monthKey,
        totalExpense: 0,
        totalIncome: 0,
        categories: {}
      };
      user.monthlySummaries.push(monthEntry);
    }

    // UPDATE MONTH TOTAL INCOME
    monthEntry.totalIncome = Number(monthEntry.totalIncome || 0) + amount;

    user.markModified("monthlySummaries");
    await user.save();

    return res.json({ ok: true, message: "Income added!" });

  } catch (err) {
    console.error("INCOME ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// AUTO DELETE ALL LAST MONTH INCOME RECORDS
router.delete("/cleanup", async (req, res) => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  await Income.deleteMany({
    date: { $lt: new Date(now.getFullYear(), now.getMonth(), 1) }
  });

  res.json({ ok: true, message: "Old income records cleaned" });
});

module.exports = router;
