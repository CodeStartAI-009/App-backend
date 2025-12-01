// utils/generateOtp.js
const crypto = require("crypto");

function generateNumericOtp(length = 6) {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = { generateNumericOtp, randomToken };
