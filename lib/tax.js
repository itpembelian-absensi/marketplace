const TAX_MODES = ["none", "exclude", "include"];

function normalizeTaxSettings(raw) {
  const mode = TAX_MODES.includes(raw?.mode) ? raw.mode : "none";
  const percentRaw = Number(raw?.percent);
  const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, percentRaw)) : 0;
  return { mode, percent };
}

function computeTax(productsSubtotal, settings) {
  const { mode, percent } = normalizeTaxSettings(settings);
  const subtotal = Math.max(0, Math.round(Number(productsSubtotal) || 0));
  if (mode === "none" || percent <= 0) {
    return {
      mode,
      percent: mode === "none" ? 0 : percent,
      amount: 0,
      addedToTotal: 0,
      dpp: subtotal,
    };
  }
  if (mode === "exclude") {
    const amount = Math.round(subtotal * (percent / 100));
    return { mode, percent, amount, addedToTotal: amount, dpp: subtotal };
  }
  const dpp = Math.round(subtotal / (1 + percent / 100));
  const amount = Math.max(0, subtotal - dpp);
  return { mode, percent, amount, addedToTotal: 0, dpp };
}

function taxLabel(mode, percent) {
  if (mode === "exclude") return `PPN ${percent}% (exclude)`;
  if (mode === "include") return `PPN ${percent}% (include)`;
  return "Tanpa pajak";
}

module.exports = {
  TAX_MODES,
  normalizeTaxSettings,
  computeTax,
  taxLabel,
};
