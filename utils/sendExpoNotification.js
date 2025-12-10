const axios = require("axios");

async function sendExpoNotification(token, title, message) {
  if (!token) return;

  await axios.post("https://exp.host/--/api/v2/push/send", {
    to: token,
    sound: "default",
    title,
    body: message,
  });
}

module.exports = { sendExpoNotification };
