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
 * Stress tests: named combinations of the same shocks, like the ones banks run. Platform presets,
 * not engine code (ADR-0043). ponytail: fixed list; let the advisor edit them like plan presets if asked.
 */
export const STRESS_TESTS = [
  { id: "stress-2016", label: "A 2016-style year", note: "milk −9c/L, feed +20%, variable rates +2 pp", shock: { milk_price_c: -9, lines_pct: { feed: 20 }, rate_shift_pp: 2 } },
  { id: "stress-inputs", label: "An input-cost spike", note: "fertiliser +60%, feed +25%, variable rates +3 pp", shock: { lines_pct: { fertiliser: 60, feed: 25 }, rate_shift_pp: 3 } },
];

/** Everything the what-if panel can run, by id (the browser only sends ids). */
export const ALL_SCENARIOS = [...WHAT_IF_PRESETS, ...STRESS_TESTS];

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
