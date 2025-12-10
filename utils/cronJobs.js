const cron = require("node-cron");
const User = require("../models/User");
const Expense = require("../models/Expense");
const SplitGroup = require("../models/SplitGroup");
const Goal = require("../models/Goal");
const { pushAndSave } = require("./notifyHelpers");

function runCronJobs() {

  // DAILY REMINDER – 7 PM
  cron.schedule("0 19 * * *", async () => {
    const users = await User.find();

    for (const user of users) {
      const lastTx = await Expense.findOne({ userId: user._id })
        .sort({ createdAt: -1 });

      const today = new Date().toDateString();
      const last = lastTx ? new Date(lastTx.createdAt).toDateString() : null;

      if (today !== last) {
        await pushAndSave(
          user._id,
          "Daily Reminder",
          "Don't forget to update your expenses today!"
        );
      }
    }
  });

  // SPLIT REMINDER – every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    const splits = await SplitGroup.find({ status: "pending" });
    for (const s of splits) {
      for (const m of s.members) {
        if (!m.hasPaid) {
          await pushAndSave(
            m.userId,
            "Split Payment Pending",
            `You still owe ₹${m.amount} in ${s.name}. Please complete payment.`
          );
        }
      }
    }
  });

  // GOAL REMINDER – every morning 8 AM
  cron.schedule("0 8 * * *", async () => {
    const goals = await Goal.find();

    for (const goal of goals) {
      if (goal.saved < goal.targetAmount) {
        await pushAndSave(
          goal.userId,
          "Goal Progress Reminder",
          `Your goal "${goal.title}" needs more savings. Stay consistent!`
        );
      }
    }
  });

  // WEEKLY ENGAGEMENT – every Monday 10 AM
  cron.schedule("0 10 * * MON", async () => {
    const users = await User.find();
    for (const user of users) {
      await pushAndSave(
        user._id,
        "Weekly Check-in",
        "New week, new opportunities! Track your expenses and stay on budget."
      );
    }
  });

  console.log("CRON JOBS RUNNING...");
}

module.exports = { runCronJobs };
