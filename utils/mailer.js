// utils/mailer.js
const nodemailer = require("nodemailer");
const config = require("../config");

// config.mail should provide host, port, user, pass, from
let transporter = null;
if (config.mail && config.mail.user && config.mail.pass) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port || 587,
    secure: !!config.mail.secure || false,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });
} else {
  console.log("Mailer not configured - will log emails to console.");
}

/**
 * sendMail(to, subject, html, text)
 * returns { ok: true } or { ok: false, error }
 */
async function sendMail(to, subject, html, text = "") {
  try {
    if (!transporter) {
      console.log("EMAIL (logged):", { to, subject, text, html });
      return { ok: true, logged: true };
    }

    const info = await transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      html,
      text,
    });

    return { ok: true, info };
  } catch (err) {
    console.error("Mailer error:", err);
    return { ok: false, error: err.message || err };
  }
}

module.exports = { sendMail };
