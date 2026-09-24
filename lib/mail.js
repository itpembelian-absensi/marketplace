const nodemailer = require("nodemailer");

function envMailSettings() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587) || 587;
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || user || "").trim();
  const secureEnv = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  const secure = secureEnv === "true" || secureEnv === "1" || port === 465;
  return { host, port, secure, user, pass, from };
}

function normalizeMailSettings(raw = {}) {
  const host = String(raw.host || "").trim();
  const port = Number(raw.port) || 587;
  const user = String(raw.user || "").trim();
  const pass = String(raw.pass || "");
  const from = String(raw.from || user || "").trim();
  const secureFlag = raw.secure === true || raw.secure === "true" || raw.secure === 1 || raw.secure === "1";
  return {
    host,
    port,
    secure: secureFlag || port === 465,
    user,
    pass,
    from,
  };
}

function mergeMailSettings(stored) {
  const env = envMailSettings();
  const source = stored && typeof stored === "object" ? stored : {};
  return normalizeMailSettings({
    host: String(source.host || "").trim() || env.host,
    port: source.port || env.port,
    secure: source.secure != null && source.secure !== "" ? source.secure : env.secure,
    user: String(source.user || "").trim() || env.user,
    pass: String(source.pass || "") || env.pass,
    from: String(source.from || "").trim() || env.from || env.user,
  });
}

function isMailConfigured(settings) {
  if (!settings?.host || !settings?.from) return false;
  if (settings.user && !settings.pass) return false;
  return true;
}

function publicMailSettings(settings) {
  return {
    host: settings.host || "",
    port: settings.port || 587,
    secure: Boolean(settings.secure),
    user: settings.user || "",
    from: settings.from || "",
    hasPassword: Boolean(settings.pass),
    configured: isMailConfigured(settings),
  };
}

async function sendMail(settings, { to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: Boolean(settings.secure),
    auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
  });
  await transporter.sendMail({
    from: settings.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  envMailSettings,
  normalizeMailSettings,
  mergeMailSettings,
  isMailConfigured,
  publicMailSettings,
  sendMail,
};
