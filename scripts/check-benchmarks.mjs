// Self-check for milk-quality benchmarks (CSO parser, above / below / about the average): part of `npm run check`.
import assert from "node:assert/strict";
import { compareToAverage, parseCsoSolids, parseIcbfRunDate, parseIcbfScc, provinceOf } from "../lib/benchmarks-core.js";

// JSON-stat 2.0 shaped like CSO AKM01, with the statistics deliberately out of order and the last month unpublished
const cso = {
  id: ["STATISTIC", "TLIST(M1)", "SOURCE"],
  size: [3, 3, 2],
  dimension: {
    STATISTIC: { category: { index: ["AKM01C3", "AKM01C1", "AKM01C2"] } }, // protein, litres, fat
    "TLIST(M1)": { category: { index: ["202606", "202607", "202608"], label: { 202606: "2026 June", 202607: "2026 July", 202608: "2026 August" } } },
    SOURCE: { category: { index: ["02", "01"] } }, // import, domestic
  },
  // order: stat → month → source (import, domestic)
  value: [
    9, 3.5, 9, 3.48, 9, null, // protein
    0, 1044, 0, 980, 0, 865, // litres
    9, 4.14, 9, 4.18, 9, null, // fat
  ],
};
assert.deepEqual(parseCsoSolids(cso), { month: "202607", label: "2026 July", fat_pct: 4.18, protein_pct: 3.48 }, "latest published domestic month, by code");
assert.equal(parseCsoSolids({ broken: true }), null);

// above / below / about, and whether that is good (lower is better for cells and bacteria)
assert.deepEqual(compareToAverage("fat_pct", 4.3, 4.18), { position: "above", good: true });
assert.deepEqual(compareToAverage("fat_pct", 4.21, 4.18), { position: "about", good: null }, "within 0.05 pp");
assert.deepEqual(compareToAverage("scc_k", 150, 179), { position: "below", good: true });
assert.deepEqual(compareToAverage("scc_k", 230, 179), { position: "above", good: false });
assert.equal(compareToAverage("tbc_k", 9, null), null, "no average published");

// ICBF weekly SCC table: columns found by header (here reordered), regions with all figures, period from the title
const icbf = `<table><tr><td><h4>% herd Breakdown for the 10 day period, &#039;29-SEP-2026&#039; to &#039;09-OCT-2026&#039;</h4></td></tr>
<tr><td><b></b></td><td><b>Average SCC**</b></td><td><b>No. Herds Recorded</b></td><td><b>Best 40% SCC</b></td><td><b>Best 20% SCC</b></td></tr>
<tr><td><b>Munster</b></td><td>182</td><td>689</td><td>158</td><td>121</td></tr>
<tr><td><b>National</b></td><td>184</td><td>1,046</td><td>160</td><td>120</td></tr></table>`;
assert.deepEqual(parseIcbfScc(icbf), {
  period: "29-SEP-2026 to 09-OCT-2026",
  regions: { Munster: { herds: 689, average: 182, best20: 121, best40: 158 }, National: { herds: 1046, average: 184, best20: 120, best40: 160 } },
});
assert.equal(parseIcbfScc("<html>page redesigned</html>"), null, "changed page → null (fallback kicks in)");
assert.equal(parseIcbfRunDate('<select><option value="09-oct-2026">09-OCT-2026<option value="02-oct-2026">'), "09-oct-2026");
assert.equal(provinceOf("Co. Cork"), "Munster");
assert.equal(provinceOf("Co. Galway"), "Connaught");
assert.equal(provinceOf("Somewhere"), null);
console.log("benchmarks ok");
