/**
 * Milk-quality reference figures ("is my milk above or below the Irish average?").
 * Pure helpers (no Next imports, so `npm run check` can test them). The engine stores no benchmarks
 * (ADR-0052): the platform keeps them, with source and date, and sends them to milk.quality.
 */

/** The four milk-quality measures: how to show them and which way is better. */
export const MILK_METRICS = {
  scc_k: { label: "Cell count", short: "SCC", lowerIsBetter: true, tolerance: 10, unit: "cells/ml", value: (v) => Math.round(v * 1000).toLocaleString("en-IE") },
  tbc_k: { label: "Bacteria", short: "TBC", lowerIsBetter: true, tolerance: 2, unit: "per ml", value: (v) => Math.round(v * 1000).toLocaleString("en-IE") },
  fat_pct: { label: "Butterfat", short: "fat", lowerIsBetter: false, tolerance: 0.05, unit: "%", value: (v) => v.toFixed(2) },
  protein_pct: { label: "Protein", short: "protein", lowerIsBetter: false, tolerance: 0.05, unit: "%", value: (v) => v.toFixed(2) },
};

/**
 * Where the farm sits against the average: "about" within the metric's tolerance (a display band, not maths:
 * 0.05 percentage points for fat / protein, 10k cells, 2k bacteria), else "above" / "below", and whether that is good.
 * @returns {{ position: "above" | "below" | "about", good: boolean | null } | null}
 */
export function compareToAverage(metric, farm, average) {
  const m = MILK_METRICS[metric];
  if (!m || typeof farm !== "number" || typeof average !== "number") return null;
  if (Math.abs(farm - average) <= m.tolerance) return { position: "about", good: null };
  const above = farm > average;
  return { position: above ? "above" : "below", good: above !== m.lowerIsBetter };
}

/**
 * CSO table AKM01 (JSON-stat 2.0, "Intake of Cows Milk by Milk Processors and Co-Ops") → the latest month's
 * national average fat and protein of domestic milk. Reads dimensions by code, not by position.
 * @returns {{ month: string, label: string, fat_pct: number, protein_pct: number } | null}
 */
export function parseCsoSolids(j) {
  try {
    const order = (d) => {
      const idx = j.dimension[d].category.index;
      return Array.isArray(idx) ? idx : Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
    };
    const [statDim, monthDim, sourceDim] = j.id;
    const stats = order(statDim);
    const months = order(monthDim);
    const sources = order(sourceDim);
    const value = (stat, m) =>
      j.value[(stats.indexOf(stat) * months.length + m) * sources.length + sources.indexOf("01")]; // 01 = domestic
    // latest month with both figures published
    for (let m = months.length - 1; m >= 0; m--) {
      const fat = value("AKM01C2", m);
      const protein = value("AKM01C3", m);
      if (typeof fat === "number" && typeof protein === "number") {
        return { month: months[m], label: j.dimension[monthDim].category.label[months[m]], fat_pct: fat, protein_pct: protein };
      }
    }
  } catch {
    // unexpected shape: the caller falls back to the last saved figures
  }
  return null;
}

/** County (as in the farm profile, "Co. Cork") → province, as ICBF names them. */
const PROVINCES = {
  Munster: ["Cork", "Kerry", "Limerick", "Tipperary", "Waterford", "Clare"],
  Leinster: ["Dublin", "Wicklow", "Wexford", "Carlow", "Kildare", "Meath", "Louth", "Westmeath", "Longford", "Offaly", "Laois", "Kilkenny"],
  Connaught: ["Galway", "Mayo", "Sligo", "Leitrim", "Roscommon"],
  Ulster: ["Donegal", "Cavan", "Monaghan"],
};
export const provinceOf = (county) => {
  const name = String(county ?? "").replace(/^Co\.?\s*/i, "").trim();
  return Object.keys(PROVINCES).find((p) => PROVINCES[p].includes(name)) ?? null;
};

const cellText = (html) => html.replace(/<[^>]+>/g, "").replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").trim();
const number = (text) => (/^[\d,.]+$/.test(text) ? Number(text.replace(/,/g, "")) : null);

/** ICBF weekly page: the newest run date offered in its week picker ("09-oct-2026"). */
export const parseIcbfRunDate = (html) => String(html).match(/<option[^>]*value="(\d{2}-[a-z]{3}-\d{4})"/i)?.[1] ?? null;

/**
 * ICBF weekly milk-recording SCC table ("% herd Breakdown", weekly-scc2) → the 10-day period and, per region
 * (provinces + "National"), the average and best / worst bands in thousands of cells per ml. Columns are found
 * by their header text, not position. Returns null if the page no longer looks like that table.
 * @returns {{ period: string, regions: Record<string, { herds: number, average: number, best20: number, best40: number }> } | null}
 */
export function parseIcbfScc(html) {
  const rows = [...String(html).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => cellText(c[1])));
  const header = rows.find((r) => r.some((c) => /^Average SCC/i.test(c)));
  if (!header) return null;
  const col = (re) => header.findIndex((c) => re.test(c));
  const cols = { herds: col(/^No\. Herds/i), average: col(/^Average SCC/i), best20: col(/^Best 20% SCC/i), best40: col(/^Best 40% SCC/i) };
  if (Object.values(cols).some((i) => i < 0)) return null;
  const regions = {};
  for (const r of rows.slice(rows.indexOf(header) + 1)) {
    const values = Object.fromEntries(Object.entries(cols).map(([k, i]) => [k, number(r[i] ?? "")]));
    if (r[0] && Object.values(values).every((v) => v != null)) regions[r[0]] = values;
  }
  const dates = String(html).match(/period,\s*&#0?39;([^&]+)&#0?39;\s*to\s*&#0?39;([^&]+)&#0?39;/i);
  return regions.National ? { period: dates ? `${dates[1]} to ${dates[2]}` : "", regions } : null;
}
