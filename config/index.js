require("dotenv").config();

module.exports = {
  port: process.env.PORT || 4000,

  // MongoDB
  mongoUri: process.env.MONGO_URI,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // OTP expiry (fallback to 15 minutes)
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 15,

  // Mail configuration
  mail: {
    host: process.env.MAIL_HOST || "",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true",
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
    from: process.env.MAIL_FROM || "no-reply@example.com",
  },
};
