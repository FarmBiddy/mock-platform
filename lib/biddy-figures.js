/**
 * Biddy answers may only quote engine values. These helpers fill and verify that.
 * No imports, so `scripts/check-biddy.mjs` can run them with plain node.
 */

/** Value at "result.months[2].closing_cash" inside obj, or undefined. */
export function valueAt(obj, path) {
  return path
    .split(/[.[\]]/)
    .filter(Boolean)
    .reduce((o, k) => (o != null && typeof o === "object" ? o[/^\d+$/.test(k) ? Number(k) : k] : undefined), obj);
}

const money = (v) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const pct = (v) => `${Math.round(v)}%`;

/**
 * Fill "{result.closing_cash}" / "{result.ytd.profit.margin_pct|pct}" from one engine response.
 * Returns the text and the figures it quoted (pointing at results[resultIndex]).
 */
export function fillTemplate(template, response, resultIndex = 0) {
  const figures_used = [];
  const text = template.replace(/\{([^}|]+)(?:\|(\w+))?\}/g, (_, path, fmt) => {
    const value = valueAt(response, path);
    if (typeof value !== "number") return "—";
    figures_used.push({ result: resultIndex, path, value });
    return fmt === "pct" ? pct(value) : money(value);
  });
  return { text, figures_used };
}

/** Figures in an answer that don't match the engine results it carries (empty = all verified). */
export function unverifiedFigures(answer) {
  return (answer.figures_used ?? []).filter((f) => valueAt(answer.results?.[f.result]?.response, f.path) !== f.value);
}
