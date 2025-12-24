const trackServerEvent = require("../utils/trackServerEvent");

if (goal.saved >= goal.amount && !goal.completed) {
  goal.completed = true;
  await goal.save();

  trackServerEvent(req.user.id, "goal_completed", {
    goalId: goal._id,
    amount: goal.amount,
  });
}
