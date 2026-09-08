function parseSqliteDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePaymentTimeout(raw = {}) {
  const enabled = raw.enabled !== false;
  const hoursIn = Number(raw.hours);
  const minutesIn = Number(raw.minutes);
  const hours = Number.isFinite(hoursIn) ? Math.max(0, Math.min(24 * 30, Math.floor(hoursIn))) : 24;
  const minutes = Number.isFinite(minutesIn) ? Math.max(0, Math.min(59, Math.floor(minutesIn))) : 0;
  let totalMinutes = hours * 60 + minutes;
  if (!Number.isFinite(Number(raw.hours)) && !Number.isFinite(Number(raw.minutes))) {
    totalMinutes = 24 * 60;
  }
  if (enabled && totalMinutes < 5) totalMinutes = 5;
  return {
    enabled,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
  };
}

function formatDurationId(totalMinutes) {
  const value = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours && minutes) return `${hours} jam ${minutes} menit`;
  if (hours) return `${hours} jam`;
  return `${minutes} menit`;
}

function computePaymentDueAt(createdAt, storedDueAt, totalMinutes) {
  const stored = parseSqliteDate(storedDueAt);
  if (stored) return stored;
  const created = parseSqliteDate(createdAt);
  if (!created) return null;
  return new Date(created.getTime() + Math.max(5, Number(totalMinutes) || 24 * 60) * 60 * 1000);
}

function shouldAutoCancelPayment(order, settings, now = new Date()) {
  if (!settings?.enabled) return false;
  if (!order) return false;
  const status = String(order.status || "").toLowerCase();
  if (status !== "unpaid") return false;
  if (String(order.payment_method || "").toLowerCase() === "cod") return false;
  const due = computePaymentDueAt(order.created_at, order.payment_due_at, settings.totalMinutes);
  if (!due) return false;
  return now.getTime() >= due.getTime();
}

module.exports = {
  parseSqliteDate,
  normalizePaymentTimeout,
  formatDurationId,
  computePaymentDueAt,
  shouldAutoCancelPayment,
};
