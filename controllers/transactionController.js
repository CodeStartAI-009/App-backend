// controllers/transactionController.js
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* -----------------------------------------------------------
   🔥 UPDATE MONTH SUMMARY (ADD / REMOVE / EDIT)
------------------------------------------------------------ */
async function updateMonthSummary(user, { monthKey, category, amount, type, mode }) {
  // mode = "add", "remove", "edit-add", "edit-remove"
  // type = "expense" / "income"

  let summary = user.monthlySummaries.find((m) => m.month === monthKey);

  if (!summary) {
    summary = {
      month: monthKey,
      totalExpense: 0,
      totalIncome: 0,
      categories: {}
    };
    user.monthlySummaries.push(summary);
  }

  if (category && !summary.categories[category]) {
    summary.categories[category] = 0;
  }

  let delta = amount;
  if (mode === "remove" || mode === "edit-remove") delta = -amount;

  if (type === "expense") {
    summary.totalExpense += delta;
    summary.categories[category] += delta;
  } else {
    summary.totalIncome += delta;
  }

  await user.save();
}

/* -----------------------------------------------------------
   🗑️ DELETE TRANSACTION
------------------------------------------------------------ */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);

    let record;

    if (type === "expense") {
      record = await Expense.findOneAndDelete({ _id: id, userId });
    } else {
      record = await Income.findOneAndDelete({ _id: id, userId });
    }

    if (!record) return res.status(404).json({ error: "Not found" });

    const monthKey = getMonthKey(record.createdAt);

    // Update user.bankBalance
    if (type === "expense") {
      user.bankBalance += record.amount; // remove expense → money returns
    } else {
      user.bankBalance -= record.amount; // remove income → subtract
    }

    // Update summary (remove)
    await updateMonthSummary(user, {
      monthKey,
      category: record.category,
      amount: record.amount,
      type,
      mode: "remove",
    });

    await user.save();

    res.json({ ok: true, msg: "Transaction deleted" });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------
   ✏️ EDIT TRANSACTION
------------------------------------------------------------ */
exports.editTransaction = async (req, res) => {
  try {
    const { id, type } = req.params;
    const { title, amount, category } = req.body;

    const userId = req.user._id;
    const user = await User.findById(userId);

    let record;
    if (type === "expense") {
      record = await Expense.findOne({ _id: id, userId });
    } else {
      record = await Income.findOne({ _id: id, userId });
    }

    if (!record) return res.status(404).json({ error: "Not found" });

    const oldAmount = record.amount;
    const oldCategory = record.category;
    const monthKey = getMonthKey(record.createdAt);

    // Adjust bank balance
    if (type === "expense") {
      user.bankBalance += oldAmount; // undo old
      user.bankBalance -= amount;    // apply new
    } else {
      user.bankBalance -= oldAmount;
      user.bankBalance += amount;
    }

    // Update summary (remove old)
    await updateMonthSummary(user, {
      monthKey,
      category: oldCategory,
      amount: oldAmount,
      type,
      mode: "edit-remove",
    });

    // Update summary (add new)
    await updateMonthSummary(user, {
      monthKey,
      category,
      amount,
      type,
      mode: "edit-add",
    });

    // Update DB fields
    record.title = title;
    record.amount = amount;
    record.category = category;

    await record.save();
    await user.save();

    res.json({ ok: true, msg: "Transaction updated", record });
  } catch (err) {
    console.log("EDIT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};
