import saved from "@/data/benchmarks.json";
import { parseCsoSolids } from "./benchmarks-core.js";
import { monthLabel } from "@/lib/format/date";

export { MILK_METRICS, compareToAverage } from "./benchmarks-core.js";

/** CSO PxStat, table AKM01: national average fat / protein of milk delivered to co-ops, monthly. Public, no key. */
const CSO_URL = "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/AKM01/JSON-stat/2.0/en";
const DAY = 24 * 60 * 60 * 1000;
// ponytail: in-memory per server process, refreshed daily; in production a monthly cron writes a benchmarks table.
let cache = null;

async function csoSolids() {
  if (cache && Date.now() - cache.at < DAY) return cache.value;
  let value = null;
  try {
    const res = await fetch(CSO_URL, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (res.ok) value = parseCsoSolids(await res.json());
  } catch {
    // network / timeout: keep the last good figures below
  }
  cache = { at: Date.now(), value: value ?? cache?.value ?? saved.cso_fallback };
  return cache.value;
}

/** "2026 August" → "Aug 2026". */
const monthName = (label) => {
  const [year, month] = String(label).split(" ");
  return `${month?.slice(0, 3)} ${year}`;
};

/**
 * Irish averages for each milk-quality measure, with where each figure comes from:
 * { fat_pct: { average, source }, …, tbc_k: null } (null = no public figure yet).
 */
export async function getMilkBenchmarks() {
  const cso = await csoSolids();
  const csoSource = `CSO, all milk delivered to co-ops, ${monthName(cso.label)}`;
  const asOf = (ym) => `${monthLabel(Number(ym.slice(5, 7)))} ${ym.slice(0, 4)}`; // "2026-07" → "Jul 2026"
  const manual = (m) => (saved.manual[m] ? { average: saved.manual[m].average, source: `${saved.manual[m].source}, ${asOf(saved.manual[m].as_of)}` } : null);
  return {
    scc_k: manual("scc_k"),
    tbc_k: manual("tbc_k"),
    fat_pct: { average: cso.fat_pct, source: csoSource },
    protein_pct: { average: cso.protein_pct, source: csoSource },
  };
}

/** The `benchmarks` block for milk.quality (engine ADR-0052): averages only; measures without a figure are left out. */
export const toEngineBenchmarks = (b) =>
  Object.fromEntries(Object.entries(b).filter(([, v]) => v).map(([metric, v]) => [metric, { average: v.average }]));
