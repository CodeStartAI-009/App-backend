const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendExpoNotification } = require("./sendExpoNotification");

async function pushAndSave(userId, title, message, io) {
  const user = await User.findById(userId);
  if (!user) return;

  // Save notification in DB
  const saved = await Notification.create({
    userId,
    title,
    message,
  });

  // Update unread count
  await User.findByIdAndUpdate(userId, { $inc: { unreadCount: 1 } });

  // Emit socket notification
  io.to(String(userId)).emit("notification", {
    title,
    message,
    createdAt: saved.createdAt,
  });

  // Send Expo push
  if (user.expoPushToken) {
    await sendExpoNotification(user.expoPushToken, title, message);
  }
}

module.exports = { pushAndSave };
