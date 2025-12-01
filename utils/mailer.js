// utils/mailer.js
const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;
if (config.mail.user && config.mail.pass) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });
}

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log("Mailer not configured (emails will be logged).");
    console.log({ to, subject, html });
    return;
  }
  await transporter.sendMail({
    from: config.mail.from,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
