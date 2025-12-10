const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendExpoNotification } = require("./sendExpoNotification");

// Save notification + push
async function pushAndSave(userId, title, message) {
  const user = await User.findById(userId);
  if (!user) return;

  // Save in DB
  await Notification.create({
    userId,
    title,
    message
  });

  // Increase unread count
  await User.findByIdAndUpdate(userId, { $inc: { unreadCount: 1 } });

  // Send push if token exists
  if (user.expoPushToken) {
    await sendExpoNotification(user.expoPushToken, title, message);
  }
}

module.exports = { pushAndSave };
