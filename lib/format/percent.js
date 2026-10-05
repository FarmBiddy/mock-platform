/**
 * Format a percentage for display. Presentation only.
 * Prefer engine-published margin_pct when available.
 *
 * @param {number|null|undefined} marginPct Engine margin_pct (e.g. 32.08)
 * @param {number} [digits=2]
 */
export function formatMarginPct(marginPct, digits = 2) {
  if (marginPct === null || marginPct === undefined || Number.isNaN(Number(marginPct))) {
    return "—";
  }

  return `${Number(marginPct).toLocaleString("en-IE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}
