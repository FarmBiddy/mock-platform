/**
 * Pure helpers for farmer edits (no Next imports, so `npm run check` can test them).
 * Edits are a flat map of whitelisted paths → number | null (null = "I don't know" → the engine asks).
 * Month paths use the calendar month: "months.9.lines.feed".
 */
const MONTH_FIELD = /^months\.([1-9]|1[0-2])\.(pl\.(milk_litres|milk_price)|cash\.milk|lines\.(feed|fertiliser|vet|contractor|labour|cattle_sales))$/;

/**
 * Plan presets the advisor tunes per client: milk price for years 1, 2 and 3+ (a per-year list that carries
 * forward) and one cost inflation for every year. Preset keys are listed, never matched by \w (no "__proto__").
 */
export const PRESET_YEARS = 3; // milk price years 1, 2 and 3+ (editable list indexes 0..2)
const PRESET = "^plan_presets\\.(cautious|base|optimistic)\\.assumptions\\.";
const PRESET_MILK = new RegExp(`${PRESET}milk_price\\.[0-2]$`);
const PRESET_INFLATION = new RegExp(`${PRESET}cost_inflation_pct$`);

/** [pattern, { signed: negatives allowed, empty: may be cleared to null, min / max: allowed range }] */
const RULES = [
  [PRESET_MILK, { min: 0.2, max: 1 }],
  [PRESET_INFLATION, { signed: true, min: -10, max: 20 }],
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
export const ownerOf = (path) => (ASSUMPTION.test(path) || PRESET_MILK.test(path) || PRESET_INFLATION.test(path) ? "advisor" : "owner");

/** Keep only whitelisted paths with valid values (browser / cookie input is untrusted). */
export function cleanEdits(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [path, value] of Object.entries(raw)) {
    const rule = ruleFor(path);
    if (!rule) continue;
    if (value === null) {
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
  return Array.isArray(v) ? (v.every((x) => x === v[0]) ? v[0] : undefined) : v;
}

/** A copy of the farm with edits applied. */
export function applyEdits(base, edits) {
  const farm = structuredClone(base);
  for (const [path, value] of Object.entries(edits)) {
    const at = locate(farm, path);
    if (!at) continue;
    // A per-year list (preset milk price) is spelled out for every editable year first, carrying the last
    // year forward, so changing year 1 doesn't move the years after it.
    if (Array.isArray(at.obj)) while (at.obj.length < PRESET_YEARS) at.obj.push(at.obj.at(-1));
    if (value === null) delete at.obj[at.key];
    // one value for a per-year list (cost inflation) → every year
    else if (Array.isArray(at.obj[at.key])) at.obj[at.key] = at.obj[at.key].map(() => value);
    else at.obj[at.key] = value;
  }
  // null opening_cash / milking_cows must reach the builders as "missing"
  if (edits.opening_cash === null) farm.opening_cash = null;
  if (edits.milking_cows === null) farm.milking_cows = null;
  return farm;
}
