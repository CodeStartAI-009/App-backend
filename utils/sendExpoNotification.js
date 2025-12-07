const axios = require("axios");

async function sendExpoNotification(expoPushToken, title, message) {
  if (!expoPushToken) return;

  await axios.post("https://exp.host/--/api/v2/push/send", {
    to: expoPushToken,
    sound: "default",
    title,
    body: message
  });
}

module.exports = { sendExpoNotification };
