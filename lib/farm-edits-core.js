/**
 * Pure helpers for farmer edits (no Next imports, so `npm run check` can test them).
 * Edits are a flat map of whitelisted paths → number | null (null = "I don't know" → the engine asks).
 * Month paths use the calendar month: "months.9.lines.feed".
 */
import { SEASONAL_SHAPE } from "./seasonal-shape.js";
const LINES = "feed|fertiliser|vet|contractor|labour|cattle_sales|biss|acres|electricity|fuel|repairs_maintenance|insurance|rent_lease|professional_fees|levies|other_operating_costs";
const FIELD = `(pl\\.(milk_litres|milk_price)|cash\\.(milk|household_drawings)|lines\\.(${LINES}))`;
const MONTH_FIELD = new RegExp(`^months\\.([1-9]|1[0-2])\\.${FIELD}$`);
/**
 * A year total typed once: "months_scale.lines.feed" = factor on every month without its own month edit,
 * so the total keeps the farm's own seasonal shape. Months edited one by one still win.
 */
const YEAR_SCALE = new RegExp(`^months_scale\\.${FIELD}$`);
/**
 * A year total with no months to scale (a new farmer, or a payment not made yet): "months_total.lines.feed" = the
 * total, spread over the months without their own edit in a typical seasonal pattern (SEASONAL_SHAPE).
 */
const YEAR_TOTAL = new RegExp(`^months_total\\.${FIELD}$`);
const AVERAGED = "pl.milk_price"; // a price: the year figure is the litre-weighted average, not a sum

/**
 * Plan presets the advisor tunes per client: milk price for years 1, 2 and 3+ (a per-year list that carries
 * forward) and one cost inflation for every year. Preset keys are listed, never matched by \w (no "__proto__").
 */
export const PRESET_YEARS = 3; // milk price years 1, 2 and 3+ (editable list indexes 0..2)
const PRESET = "^plan_presets\\.(cautious|base|optimistic)\\.assumptions\\.";
const PRESET_MILK = new RegExp(`${PRESET}milk_price\\.[0-2]$`);
const PRESET_INFLATION = new RegExp(`${PRESET}cost_inflation_pct$`);
// Variable-rate change vs today for every plan year (the engine carries it forward; missing = as today).
const PRESET_RATES = new RegExp(`${PRESET}interest_rate_shift_pp$`);

/** [pattern, { signed: negatives allowed, empty: may be cleared to null, min / max: allowed range }] */
const RULES = [
  [PRESET_MILK, { min: 0.2, max: 1 }],
  [PRESET_INFLATION, { signed: true, min: -10, max: 20 }],
  [PRESET_RATES, { signed: true, min: -3, max: 10 }],
  [/^opening_cash$/, { signed: true, empty: true }],
  [/^milking_cows$/, { empty: true }],
  [/^hectares$/, {}],
  [/^market\.milk_price$/, {}],
  [/^new_loan_terms\.(annual_rate|term_months|min_cover)$/, {}],
  [MONTH_FIELD, {}],
  [YEAR_SCALE, { max: 10 }],
  [YEAR_TOTAL, {}],
  // Tax profile (engine tax.estimate, ADR-0053) and the accountant's tax figure, which wins where given.
  [/^tax\.business_type$/, { choices: ["sole_trader", "company"] }],
  [/^tax\.marital_status$/, { choices: ["single", "married"] }],
  [/^tax\.vat$/, { choices: ["flat_rate", "registered"] }],
  [/^tax\.spouse_paye_income$/, {}],
  [/^tax\.young_trained_farmer_first_year$/, { min: 2000, max: 2100, empty: true }],
  [/^household\.tax_per_year$/, { empty: true }],
  // From last year's accounts (lib/accounts-import.js): opening valuations, per-asset grant and allowance, last year's tax
  [/^balance_sheet\.(livestock_opening_value|stock_opening_value)$/, {}],
  [/^tax\.grant\.[a-z0-9-]+$/, {}],
  [/^tax\.allowance\.[a-z0-9-]+$/, { choices: ["farm_buildings", "plant", "slurry_storage", "farm_safety", "none"] }],
  [/^tax\.last_year$/, { min: 2000, max: 2100 }],
  [/^tax\.income_averaging$/, { choices: ["elected", "not_elected"] }],
  // What the farmer expects the herd and stock to be worth at 31 Dec this year (empty = latest valuation)
  [/^tax\.year_end_(livestock|stock)$/, { empty: true }],
  [/^tax\.last_year_taxable_profit$/, { signed: true }],
  [/^tax\.last_year_tax$/, {}],
  [/^tax\.prior_profit\.(19|20)\d\d$/, { signed: true }],
];

export const ruleFor = (path) => RULES.find(([re]) => re.test(path))?.[1] ?? null;

/** Who may change a field: the farmer keeps the records, the advisor sets the forecast assumptions. */
const ASSUMPTION = /^(market\.milk_price|new_loan_terms\.(annual_rate|term_months|min_cover))$/;
export const ownerOf = (path) => (ASSUMPTION.test(path) || PRESET_MILK.test(path) || PRESET_INFLATION.test(path) || PRESET_RATES.test(path) ? "advisor" : "owner");

/** Keep only whitelisted paths with valid values (browser / cookie input is untrusted). */
export function cleanEdits(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [path, value] of Object.entries(raw)) {
    const rule = ruleFor(path);
    if (!rule) continue;
    if (rule.choices) {
      if (rule.choices.includes(value)) out[path] = value;
    } else if (value === null) {
      if (rule.empty) out[path] = null;
    } else if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (rule.signed || value >= 0) &&
      value >= (rule.min ?? -Infinity) &&
      value <= (rule.max ?? Infinity)
    ) {
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
  if (keys[0] === "plan_presets") {
    // whitelisted path: plan_presets.<preset>.assumptions.<field>[.<year index>]
    let obj = farm;
    for (const k of keys.slice(0, -1)) obj = obj[k] ?? (obj[k] = {});
    return { obj, key: keys.at(-1) };
  }
  if (keys[0] === "tax" && keys.length === 3) {
    // whitelisted path: tax.<grant | allowance | prior_profit>.<asset id or year>
    const tax = farm.tax ?? (farm.tax = {});
    return { obj: tax[keys[1]] ?? (tax[keys[1]] = {}), key: keys[2] };
  }
  if (keys.length === 2) return { obj: farm[keys[0]] ?? (farm[keys[0]] = {}), key: keys[1] };
  return { obj: farm, key: keys[0] };
}

export function valueAtPath(farm, path) {
  const at = locate(farm, path);
  return at ? at.obj[at.key] : undefined;
}

/**
 * What a field means for the engine: a per-year list entry carries the last year forward,
 * and a list with one value for every year reads as that value (undefined if the years differ).
 */
export function effectiveValue(farm, path) {
  const keys = path.split(".");
  if (keys[0] === "plan_presets" && /^\d$/.test(keys.at(-1))) {
    const list = valueAtPath(farm, keys.slice(0, -1).join("."));
    return Array.isArray(list) ? (list[Number(keys.at(-1))] ?? list.at(-1)) : undefined;
  }
  const v = valueAtPath(farm, path);
  if (v === undefined && PRESET_RATES.test(path)) return 0; // no rate change in the preset = as today
  return Array.isArray(v) ? (v.every((x) => x === v[0]) ? v[0] : undefined) : v;
}

const monthValue = (m, field) => field.split(".").reduce((o, k) => o?.[k], m) ?? 0;

/** The year-so-far figure for a month field: the sum, or for the milk price the litre-weighted average. */
export function yearValue(farm, field) {
  if (field !== AVERAGED) return farm.months.reduce((s, m) => s + monthValue(m, field), 0);
  const litres = farm.months.reduce((s, m) => s + monthValue(m, "pl.milk_litres"), 0);
  return litres ? farm.months.reduce((s, m) => s + monthValue(m, "pl.milk_litres") * monthValue(m, field), 0) / litres : 0;
}

/**
 * The months_scale factor that makes `field`'s year figure equal `target`, given the other edits: months edited
 * one by one stay as they are, the rest are the demo figures × factor. null when there is nothing to scale.
 */
export function scaleForTarget(base, edits, field, target) {
  const own = (m) => `months.${m.month}.${field}` in edits;
  const farm = applyEdits(base, Object.fromEntries(Object.entries(edits).filter(([p]) => p !== `months_scale.${field}`)));
  // weight: 1 for a sum; the month's litres (after edits) for the averaged price
  const weight = (m) => (field === AVERAGED ? monthValue(farm.months.find((x) => x.month === m.month), "pl.milk_litres") : 1);
  const totalWeight = field === AVERAGED ? base.months.reduce((s, m) => s + weight(m), 0) : 1;
  const fixed = base.months.filter(own).reduce((s, m) => s + weight(m) * edits[`months.${m.month}.${field}`], 0);
  const free = base.months.filter((m) => !own(m)).reduce((s, m) => s + weight(m) * monthValue(m, field), 0);
  return free ? Math.max(0, (target * totalWeight - fixed) / free) : null;
}

/** A copy of the farm with edits applied. */
export function applyEdits(base, edits) {
  const farm = structuredClone(base);
  // year totals first (on the demo months), so month-by-month edits below override them
  const scales = { ...edits };
  // The milk cheque follows litres × price unless the farmer gave cheques of their own.
  // ponytail: follows year totals only; a single month's litres or price doesn't move that month's cheque.
  const ownCheque = "months_scale.cash.milk" in edits || Object.keys(edits).some((p) => p.endsWith(".cash.milk"));
  if (!ownCheque) {
    const follow = (edits["months_scale.pl.milk_litres"] ?? 1) * (edits["months_scale.pl.milk_price"] ?? 1);
    if (follow !== 1) scales["months_scale.cash.milk"] = follow;
  }
  for (const [path, factor] of Object.entries(scales)) {
    if (!YEAR_SCALE.test(path) || factor == null) continue;
    const [group, key] = path.split(".").slice(1);
    for (const m of farm.months) if (m[group]?.[key] != null) m[group][key] *= factor;
  }
  for (const [path, total] of Object.entries(edits)) {
    if (!YEAR_TOTAL.test(path) || total == null) continue;
    const field = path.slice("months_total.".length);
    const [group, key] = field.split(".");
    const free = farm.months.filter((m) => !(`months.${m.month}.${field}` in edits));
    const set = (m, v) => ((m[group] ??= {})[key] = v);
    if (field === AVERAGED) {
      for (const m of free) set(m, total); // a price: the same in every month
      continue;
    }
    const rest = total - farm.months.filter((m) => !free.includes(m)).reduce((s, m) => s + (edits[`months.${m.month}.${field}`] ?? 0), 0);
    const shape = free.map((m) => SEASONAL_SHAPE[field]?.[m.month - 1] ?? 0);
    const sum = shape.reduce((a, b) => a + b, 0);
    free.forEach((m, i) => set(m, Math.max(0, rest) * (sum ? shape[i] / sum : 1 / free.length)));
  }
  for (const [path, value] of Object.entries(edits)) {
    if (YEAR_SCALE.test(path) || YEAR_TOTAL.test(path)) continue;
    const at = locate(farm, path);
    if (!at) continue;
    // A per-year list (preset milk price) is spelled out for every editable year first, carrying the last
    // year forward, so changing year 1 doesn't move the years after it.
    if (Array.isArray(at.obj)) while (at.obj.length < PRESET_YEARS) at.obj.push(at.obj.at(-1));
    if (value === null) delete at.obj[at.key];
    // rate change: one value for every year (a one-item list the engine carries forward)
    else if (PRESET_RATES.test(path)) at.obj[at.key] = [value];
    // one value for a per-year list (cost inflation) → every year
    else if (Array.isArray(at.obj[at.key])) at.obj[at.key] = at.obj[at.key].map(() => value);
    else at.obj[at.key] = value;
  }
  // A farm with no cheques on record (a new farmer): each month's cheque is the month before's litres × price,
  // as co-ops pay. ponytail: January has no December before it, so it starts at 0.
  if (!ownCheque && farm.months?.length && farm.months.every((m) => !m.cash?.milk)) {
    farm.months.forEach((m, i) => {
      const prev = farm.months[i - 1];
      (m.cash ??= {}).milk = prev ? (prev.pl?.milk_litres ?? 0) * (prev.pl?.milk_price ?? 0) : 0;
    });
  }
  // null opening_cash / milking_cows must reach the builders as "missing"
  if (edits.opening_cash === null) farm.opening_cash = null;
  if (edits.milking_cows === null) farm.milking_cows = null;
  return farm;
}
