// utils/hashPayment.js
const bcrypt = require("bcryptjs");

async function hashPaymentValue(value) {
  return await bcrypt.hash(String(value), 10);
}

module.exports = { hashPaymentValue };
