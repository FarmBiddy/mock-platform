/**
 * Milk-quality reference figures ("is my milk above or below the Irish average?").
 * Pure helpers (no Next imports, so `npm run check` can test them). The engine stores no benchmarks
 * (ADR-0052): the platform keeps them, with source and date, and sends them to milk.quality.
 */

/** The four milk-quality measures: how to show them and which way is better. */
export const MILK_METRICS = {
  scc_k: { label: "Cell count (SCC)", hint: "Udder health · lower is better", lowerIsBetter: true, tolerance: 10, show: (v) => `${Math.round(v * 1000).toLocaleString("en-IE")} cells/ml` },
  tbc_k: { label: "Bacteria (TBC)", hint: "Milk hygiene · lower is better", lowerIsBetter: true, tolerance: 2, show: (v) => `${Math.round(v * 1000).toLocaleString("en-IE")} /ml` },
  fat_pct: { label: "Butterfat", hint: "Higher is better: it pays more", lowerIsBetter: false, tolerance: 0.05, show: (v) => `${v.toFixed(2)}%` },
  protein_pct: { label: "Protein", hint: "Higher is better: it pays more", lowerIsBetter: false, tolerance: 0.05, show: (v) => `${v.toFixed(2)}%` },
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
