// utils/mailer.js
const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: config.mail.user,  // Gmail address
    pass: config.mail.pass,  // App password
  },
});

async function sendMail(to, subject, html, text = "") {
  try {
    const info = await transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      html,
      text,
    });

    console.log("📨 Email sent:", info.messageId);
    return { ok: true };
  } catch (err) {
    console.error("❌ sendMail error:", err);
    return { ok: false, error: err };
  }
}

module.exports = { sendMail };
