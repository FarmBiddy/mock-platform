import saved from "@/data/benchmarks.json";
import { parseCsoSolids, parseIcbfRunDate, parseIcbfScc, provinceOf } from "./benchmarks-core.js";

export { MILK_METRICS, compareToAverage } from "./benchmarks-core.js";

/**
 * Where the milk-quality averages come from. Both are public pages / APIs read by the platform (never the engine):
 * - CSO PxStat, table AKM01: national average fat / protein of milk delivered to co-ops, monthly. Official open API.
 * - ICBF weekly milk recording, SCC "% herd Breakdown": average SCC by province and nationally, weekly.
 *   Not an API: an HTML table on a public page. ponytail: fine for the demo; production needs ICBF's permission
 *   (or their official data feed) — see the notes in data/benchmarks.json.
 */
const CSO_URL = "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/AKM01/JSON-stat/2.0/en";
const ICBF = "https://webapp.icbf.com/v2/app/weekly-update";
const DAY = 24 * 60 * 60 * 1000;
/** Provinces with fewer recorded herds than this use the national figure (a small sample swings week to week). */
const MIN_HERDS = 100;

// ponytail: in-memory per server process, refreshed daily; in production a scheduled job writes a benchmarks table.
const cache = {};
async function cached(key, load, fallback) {
  if (cache[key] && Date.now() - cache[key].at < DAY) return cache[key].value;
  let value = null;
  try {
    value = await load();
  } catch {
    // network / timeout / page changed: keep the last good figures below
  }
  cache[key] = { at: Date.now(), value: value ?? cache[key]?.value ?? fallback };
  return cache[key].value;
}
const get = (url) => fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" }).then((r) => (r.ok ? r : Promise.reject(new Error(`${r.status}`))));

const csoSolids = () => cached("cso", async () => parseCsoSolids(await (await get(CSO_URL)).json()), saved.cso_fallback);
const icbfScc = () =>
  cached(
    "icbf",
    async () => {
      const runDate = parseIcbfRunDate(await (await get(`${ICBF}/scc-holder`)).text());
      return runDate ? parseIcbfScc(await (await get(`${ICBF}/weekly-scc2?run_date_sel=${runDate}`)).text()) : null;
    },
    saved.icbf_fallback,
  );

/** "2026 August" → "Aug 2026"; "29-SEP-2026 to 09-OCT-2026" → "29 Sep – 9 Oct 2026". */
const monthName = (label) => {
  const [year, month] = String(label).split(" ");
  return `${month?.slice(0, 3)} ${year}`;
};
const period = (p) => {
  const [from, to] = p.split(" to ").map((d) => d.split("-").map((x, i) => (i === 1 ? x[0] + x.slice(1).toLowerCase() : String(Number(x)))));
  return from && to ? `${from[0]} ${from[1]} – ${to[0]} ${to[1]} ${to[2]}` : p;
};

/**
 * Irish averages for each milk-quality measure, with where each figure comes from:
 * { scc_k: { label, average, source }, …, tbc_k: null } (null = no public figure yet).
 * SCC uses the farm's province when enough herds were recorded there, else the national figure.
 */
export async function getMilkBenchmarks(farm) {
  const [cso, icbf] = await Promise.all([csoSolids(), icbfScc()]);
  const csoSource = `CSO, all milk delivered to co-ops, ${monthName(cso.label)}`;
  const province = provinceOf(farm?.profile?.county);
  const region = province && icbf.regions[province]?.herds >= MIN_HERDS ? province : "National";
  return {
    scc_k: {
      label: region === "National" ? "Irish average" : `${region} average`,
      average: icbf.regions[region].average,
      source: `ICBF milk recording, ${region === "National" ? "all of Ireland" : region}, ${period(icbf.period)}`,
    },
    tbc_k: saved.manual.tbc_k,
    fat_pct: { label: "Irish average", average: cso.fat_pct, source: csoSource },
    protein_pct: { label: "Irish average", average: cso.protein_pct, source: csoSource },
  };
}

/** The `benchmarks` block for milk.quality (engine ADR-0052): averages only; measures without a figure are left out. */
export const toEngineBenchmarks = (b) =>
  Object.fromEntries(Object.entries(b).filter(([, v]) => v).map(([metric, v]) => [metric, { average: v.average }]));
