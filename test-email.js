// backend/test-email.js
require("dotenv").config();
const { sendMail } = require("./utils/mailer");

async function test() {
  try {
    await sendMail(
      "varundevapathni@gmail.com",
      "Test from WalletWave",
      "<p>Hello — this is a test</p>",
      "Hello — this is a test"
    );

    console.log("✅ Email sent successfully!");
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
}

test();
