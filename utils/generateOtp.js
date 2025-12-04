// utils/generateOtp.js
function generateNumericOtp(length = 6) {
  let otp = "";
  for (let i = 0; i < length; i++) otp += Math.floor(Math.random() * 10).toString();
  return otp;
}

module.exports = { generateNumericOtp };
