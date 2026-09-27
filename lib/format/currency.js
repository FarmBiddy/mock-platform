/**
 * Format a money amount for display. Presentation only — no calculations.
 *
 * @param {number|null|undefined} amount
 * @param {string} [currency='EUR']
 */
export function formatCurrency(amount, currency = "EUR") {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString("en-IE")}`;
  }
}
