/**
 * Pure helpers for farmer edits (no Next imports, so `npm run check` can test them).
 * Edits are a flat map of whitelisted paths → number | null (null = "I don't know" → the engine asks).
 * Month paths use the calendar month: "months.9.lines.feed".
 */
const MONTH_FIELD = /^months\.([1-9]|1[0-2])\.(pl\.(milk_litres|milk_price)|cash\.milk|lines\.(feed|fertiliser|vet|contractor|labour|cattle_sales))$/;

/** [pattern, { signed: negatives allowed, empty: may be cleared to null }] */
const RULES = [
  [/^opening_cash$/, { signed: true, empty: true }],
  [/^milking_cows$/, { empty: true }],
  [/^hectares$/, {}],
  [/^market\.milk_price$/, {}],
  [/^new_loan_terms\.(annual_rate|term_months|min_cover)$/, {}],
  [MONTH_FIELD, {}],
];

export const ruleFor = (path) => RULES.find(([re]) => re.test(path))?.[1] ?? null;

/** Who may change a field: the farmer keeps the records, the advisor sets the forecast assumptions. */
const ASSUMPTION = /^(market\.milk_price|new_loan_terms\.(annual_rate|term_months|min_cover))$/;
export const ownerOf = (path) => (ASSUMPTION.test(path) ? "advisor" : "owner");

/** Keep only whitelisted paths with valid values (browser / cookie input is untrusted). */
export function cleanEdits(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [path, value] of Object.entries(raw)) {
    const rule = ruleFor(path);
    if (!rule) continue;
    if (value === null) {
      if (rule.empty) out[path] = null;
    } else if (typeof value === "number" && Number.isFinite(value) && (rule.signed || value >= 0)) {
      out[path] = value;
    }
  }
  return out;
}

/** Where a path lives in the farm JSON (months.N → the actual month with month === N). */
function locate(farm, path) {
  const keys = path.split(".");
  if (keys[0] === "months") {
    const month = farm.months.find((m) => m.month === Number(keys[1]));
    return month ? { obj: month[keys[2]] ?? (month[keys[2]] = {}), key: keys[3] } : null;
  }
  if (keys.length === 2) return { obj: farm[keys[0]] ?? (farm[keys[0]] = {}), key: keys[1] };
  return { obj: farm, key: keys[0] };
}

export function valueAtPath(farm, path) {
  const at = locate(farm, path);
  return at ? at.obj[at.key] : undefined;
}

/** A copy of the farm with edits applied. */
export function applyEdits(base, edits) {
  const farm = structuredClone(base);
  for (const [path, value] of Object.entries(edits)) {
    const at = locate(farm, path);
    if (!at) continue;
    if (value === null) delete at.obj[at.key];
    else at.obj[at.key] = value;
  }
  // null opening_cash / milking_cows must reach the builders as "missing"
  if (edits.opening_cash === null) farm.opening_cash = null;
  if (edits.milking_cows === null) farm.milking_cows = null;
  return farm;
}
