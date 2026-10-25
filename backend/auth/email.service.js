import nodemailer from "nodemailer";

let transporter;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured.");
  }

  const port = Number(process.env.SMTP_PORT || 587);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

function getAppOrigin() {
  return (
    process.env.APP_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:5174"
  ).replace(/\/+$/, "");
}

async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();

  return mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationEmail({ to, name, token }) {
  const url = `${getAppOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: "Verify your Foresight account",
    text: [
      `Hi ${name},`,
      "",
      "Please verify your Foresight email address using this link:",
      url,
      "",
      "This link expires in 24 hours. If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6;color:#29382c">
        <h2>Verify your Foresight account</h2>
        <p>Hi ${safeName},</p>
        <p>Please confirm your email address to finish creating your Foresight account.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#3f7048;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p>
        <p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const url = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: "Reset your Foresight password",
    text: [
      `Hi ${name},`,
      "",
      "Use this link to reset your Foresight password:",
      url,
      "",
      "This link expires in 1 hour and can only be used once.",
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6;color:#29382c">
        <h2>Reset your password</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Foresight password.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#3f7048;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
        <p>This link expires in 1 hour and can only be used once. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
