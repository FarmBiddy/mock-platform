/**
 * What-if presets the farmer can tick. Shocks use the engine's risk.sensitivity vocabulary.
 * Rate shocks only reprice loans marked variable (ADR-0043): fixed loans and the surplus don't move.
 */
export const WHAT_IF_PRESETS = [
  { id: "milk-5", label: "Milk −5c/L", shock: { milk_price_c: -5 } },
  { id: "milk-10", label: "Milk −10c/L", shock: { milk_price_c: -10 } },
  { id: "feed+10", label: "Feed +10%", shock: { lines_pct: { feed: 10 } } },
  { id: "fert+20", label: "Fertiliser +20%", shock: { lines_pct: { fertiliser: 20 } } },
  { id: "herd-10", label: "10% fewer cows", shock: { herd_pct: -10 } },
  { id: "rates+2", label: "Variable rates +2 pp", shock: { rate_shift_pp: 2 } },
];

/**
 * Stress tests: named combinations of the same shocks, like the ones banks run. Platform presets, not
 * engine code (ADR-0043); the advisor tunes them once for all clients (`stressTests(edits)`). Pure module:
 * `npm run check` tests the validation.
 */
const STRESS_DEFAULTS = [
  { id: "stress-2016", label: "A 2016-style year", milk_price_c: -9, feed_pct: 20, fertiliser_pct: 0, rate_shift_pp: 2 },
  { id: "stress-inputs", label: "An input-cost spike", milk_price_c: 0, feed_pct: 25, fertiliser_pct: 60, rate_shift_pp: 3 },
];

/** Editable stress-test fields: [label, unit, min, max]. */
export const STRESS_FIELDS = {
  milk_price_c: ["Milk", "c/L", -30, 10],
  feed_pct: ["Feed", "%", -50, 200],
  fertiliser_pct: ["Fertiliser", "%", -50, 200],
  rate_shift_pp: ["Variable rates", "pp", -3, 10],
};

const signed = (v, unit) => `${v > 0 ? "+" : "−"}${Math.abs(v)}${unit === "c/L" ? "c/L" : unit === "pp" ? " pp" : "%"}`;

/** Untrusted cookie / form input → { [test id]: { label?, <field>? } } within range, known ids only. */
export function cleanStressEdits(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const { id } of STRESS_DEFAULTS) {
    const e = raw[id];
    if (!e || typeof e !== "object") continue;
    const clean = {};
    if (typeof e.label === "string" && e.label.trim()) clean.label = e.label.trim().slice(0, 40);
    for (const [field, [, , min, max]] of Object.entries(STRESS_FIELDS)) {
      if (typeof e[field] === "number" && Number.isFinite(e[field]) && e[field] >= min && e[field] <= max) clean[field] = e[field];
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

/** The stress tests with the advisor's edits: label, a note generated from the values, and the engine shock. */
export function stressTests(edits = {}) {
  return STRESS_DEFAULTS.map((d) => {
    const t = { ...d, ...edits[d.id] };
    const lines = Object.fromEntries([["feed", t.feed_pct], ["fertiliser", t.fertiliser_pct]].filter(([, v]) => v));
    const shock = {
      ...(t.milk_price_c ? { milk_price_c: t.milk_price_c } : {}),
      ...(Object.keys(lines).length ? { lines_pct: lines } : {}),
      ...(t.rate_shift_pp ? { rate_shift_pp: t.rate_shift_pp } : {}),
    };
    const note = Object.entries(STRESS_FIELDS)
      .filter(([field]) => t[field])
      .map(([field, [name, unit]]) => `${field === "rate_shift_pp" ? "variable rates" : name.toLowerCase()} ${signed(t[field], unit)}`)
      .join(", ");
    return { id: d.id, label: t.label, note: note || "no change", shock, values: t, edited: Boolean(edits[d.id]) };
  });
}

/**
 * "What if it lasts?": the Plan URL carrying a what-if shock as five-year assumptions, starting from the
 * Base preset. Milk: this year's forecast price (engine's milk_price_c) plus the shift, for every year;
 * a line % becomes year-1 inflation (the higher level then carries on); herd % in year 1; rate shift kept.
 * ponytail: price + shift is a sum on the platform; drop it once plan.projection takes a milk price shift.
 */
export function planHref(shock, forecastPriceC) {
  const q = new URLSearchParams({ s: "base" });
  if (shock.milk_price_c) q.set("price", String(Math.round((forecastPriceC + shock.milk_price_c) * 10) / 1000));
  if (shock.lines_pct?.feed) q.set("feed", String(shock.lines_pct.feed));
  if (shock.lines_pct?.fertiliser) q.set("fert", String(shock.lines_pct.fertiliser));
  if (shock.herd_pct) q.set("herd", String(shock.herd_pct));
  if (shock.rate_shift_pp) q.set("rates", String(shock.rate_shift_pp));
  return `/plan?${q}`;
}

/** What a Free owner can run: three everyday shocks (plus the break-even line); the rest is Pro. */
export const FREE_SCENARIO_IDS = ["milk-5", "feed+10", "rates+2"];
