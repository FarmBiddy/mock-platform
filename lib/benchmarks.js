import saved from "@/data/benchmarks.json";
import { icbfRunDateIn, parseCsoSolidsSeries, parseIcbfRunDates, parseIcbfScc, provinceOf } from "./benchmarks-core.js";
import { monthLabel } from "@/lib/format/date";

export { MILK_METRICS } from "./benchmarks-core.js";

/**
 * Where the milk-quality averages come from. Both are public pages / APIs read by the platform (never the engine):
 * - CSO PxStat, table AKM01: national average fat / protein of milk delivered to co-ops, every month. Official open API.
 * - ICBF weekly milk recording, SCC "% herd Breakdown": average SCC by province and nationally, weekly since 2017.
 *   Not an API: an HTML table on a public page. ponytail: fine for the demo; production needs ICBF's permission
 *   (or their official data feed) — see the notes in data/benchmarks.json.
 * The engine (milk.quality) weights a monthly series by the farm's own litres, so the year is compared like for like.
 */
const CSO_URL = "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/AKM01/JSON-stat/2.0/en";
const ICBF = "https://webapp.icbf.com/v2/app/weekly-update";
const DAY = 24 * 60 * 60 * 1000;
/** Provinces with fewer recorded herds than this use the national figure (a small sample swings week to week). */
const MIN_HERDS = 100;

// ponytail: in-memory per server process; past ICBF weeks never change, the newest data is refreshed daily.
// In production a scheduled job writes a benchmarks table.
const cache = {};
async function cached(key, load, fallback, ttl = DAY) {
  if (cache[key] && Date.now() - cache[key].at < ttl) return cache[key].value;
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

const csoSeries = () =>
  cached("cso", async () => {
    const series = parseCsoSolidsSeries(await (await get(CSO_URL)).json());
    return series.length ? series : null;
  }, [saved.cso_fallback]);
const icbfRunDates = () => cached("icbf-weeks", async () => parseIcbfRunDates(await (await get(`${ICBF}/scc-holder`)).text()), []);
const icbfWeek = (runDate) => cached(`icbf-${runDate}`, async () => parseIcbfScc(await (await get(`${ICBF}/weekly-scc2?run_date_sel=${runDate}`)).text()), null, Infinity);

const ym = (year, month) => `${year}${String(month).padStart(2, "0")}`;
const named = (year, month) => `${monthLabel(month)} ${year}`;
/** "29-SEP-2026 to 09-OCT-2026" → "29 Sep – 9 Oct 2026". */
const period = (p) => {
  const [from, to] = p.split(" to ").map((d) => d.split("-").map((x, i) => (i === 1 ? x[0] + x.slice(1).toLowerCase() : String(Number(x)))));
  return from && to ? `${from[0]} ${from[1]} – ${to[0]} ${to[1]} ${to[2]}` : p;
};
/** ICBF region for a farm: its province when enough herds recorded that week, else national. */
const regionFor = (week, province) => (province && week.regions[province]?.herds >= MIN_HERDS ? province : "National");

/**
 * The averages to compare a farm's milk with, for the given statement months ([{ year, month }], oldest first):
 * per measure `{ label, source, engine }`, where `engine` is what milk.quality takes —
 * `{ monthly_average: [{ year, month, value }] }` when every month is covered (a like-for-like year), else
 * `{ average }` with the latest figure. TBC: null (no public figure yet).
 */
export async function getMilkBenchmarks(farm, months) {
  const province = provinceOf(farm?.profile?.county);
  const [cso, runDates] = await Promise.all([csoSeries(), icbfRunDates()]);
  const first = months[0];
  const last = months.at(-1);
  const span = `${named(first.year, first.month)} – ${named(last.year, last.month)}`;

  // Fat / protein (CSO): months not published yet (CSO runs ~6 weeks behind) use the latest published month.
  const latestCso = cso.at(-1);
  const csoFor = (y, m) => cso.find((r) => r.month === ym(y, m)) ?? (ym(y, m) > latestCso.month ? latestCso : null);
  const csoRows = months.map(({ year, month }) => ({ year, month, row: csoFor(year, month) }));
  const csoComplete = csoRows.every((r) => r.row);
  const carried = csoRows.filter((r) => r.row && r.row.month !== ym(r.year, r.month)).map((r) => monthLabel(r.month));
  const csoSource = csoComplete
    ? `CSO, all milk delivered to co-ops, ${span}${carried.length ? ` (${carried.join(", ")} not published yet: ${latestCso.label.split(" ")[1].slice(0, 3)} used)` : ""}`
    : `CSO, all milk delivered to co-ops, ${latestCso.label.split(" ")[1].slice(0, 3)} ${latestCso.month.slice(0, 4)}`;
  const solids = (metric) =>
    csoComplete
      ? { monthly_average: csoRows.map(({ year, month, row }) => ({ year, month, value: row[metric] })) }
      : { average: latestCso[metric] };

  // SCC (ICBF): each month's last weekly snapshot, the farm's province when enough herds recorded, else national.
  const weeks = await Promise.all(months.map(async ({ year, month }) => {
    const runDate = icbfRunDateIn(runDates, year, month);
    return { year, month, week: runDate ? await icbfWeek(runDate) : null };
  }));
  const sccComplete = weeks.every((w) => w.week);
  const regions = new Set(weeks.filter((w) => w.week).map((w) => regionFor(w.week, province)));
  const newest = weeks.findLast((w) => w.week)?.week ?? saved.icbf_fallback;
  const scc = sccComplete
    ? {
        label: "Average",
        source: `ICBF milk recording, ${[...regions].map((r) => (r === "National" ? "all of Ireland" : r)).join(" / ")}, each month’s last weekly figure, ${span}`,
        engine: { monthly_average: weeks.map(({ year, month, week }) => ({ year, month, value: week.regions[regionFor(week, province)].average })) },
      }
    : {
        label: "Latest average",
        source: `ICBF milk recording, ${regionFor(newest, province)}, ${period(newest.period)}`,
        engine: { average: newest.regions[regionFor(newest, province)].average },
      };

  const solidsLabel = csoComplete ? "Average" : "Latest average";
  return {
    scc_k: scc,
    tbc_k: saved.manual.tbc_k,
    fat_pct: { label: solidsLabel, source: csoSource, engine: solids("fat_pct") },
    protein_pct: { label: solidsLabel, source: csoSource, engine: solids("protein_pct") },
  };
}

/** The `benchmarks` block for milk.quality (engine ADR-0052): each measure's series or single average; measures without one are left out. */
export const toEngineBenchmarks = (b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v).map(([metric, v]) => [metric, v.engine]));
