// backend/test-email.js
require("dotenv").config();
const { sendMail } = require("./utils/mailer");

async function test() {
  const res = await sendMail(
    "varundevapathni@gmail.com",
    "Test from WalletWave",
    "<p>Hello — this is a test</p>",
    "Hello — this is a test"
  );
  console.log(res);
}
test();
