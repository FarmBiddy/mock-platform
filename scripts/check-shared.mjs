// Self-check for "Share with my advisor" input (query string / form / cookie): part of `npm run check`.
import assert from "node:assert/strict";
import { cleanShare, cleanShares, safeHref } from "../lib/shared-core.js";
import { cleanStressEdits, stressTests } from "../lib/financials/whatIf.js";

assert.equal(safeHref("/plan?s=base&price=0.42&inv=parlour"), "/plan?s=base&price=0.42&inv=parlour");
assert.equal(safeHref("/farm-financials"), "/farm-financials");
assert.equal(safeHref("/decisions?go=1&inv=parlour&amount=120000&l0=Labour&a0=15000"), "/decisions?go=1&inv=parlour&amount=120000&l0=Labour&a0=15000");
for (const bad of ["//evil.com", "https://evil.com", "/plan/../x", "/settings", "/plan?x=<script>", "javascript:alert(1)", "/plan#x", 42, null]) {
  assert.equal(safeHref(bad), null, String(bad));
}

const ok = cleanShare({ id: "a1", farm: "joe-bloggs", title: " Parlour plan ", note: "x".repeat(500), href: "/plan?s=base", at: "2026-10-06T10:00:00Z", extra: 1 });
assert.equal(ok.title, "Parlour plan");
assert.equal(ok.note.length, 280);
assert.equal("extra" in ok, false);
assert.equal(cleanShare({ title: "x", href: "//evil.com" }), null);
assert.equal(cleanShare({ title: "", href: "/plan" }), null);
assert.deepEqual(cleanShares({ not: "an array" }), []);
assert.equal(cleanShares(Array(9).fill({ title: "t", href: "/plan" })).length, 5);


// advisor stress tests (cookie / form input): known ids, ranges, label length; generated note and shock
assert.deepEqual(
  cleanStressEdits({ "stress-2016": { milk_price_c: -12, feed_pct: 500, label: "x".repeat(60) }, "__proto__": { milk_price_c: 1 }, other: { feed_pct: 1 } }),
  { "stress-2016": { label: "x".repeat(40), milk_price_c: -12 } },
);
const [t2016] = stressTests({ "stress-2016": { milk_price_c: -12, rate_shift_pp: 0 } });
assert.deepEqual(t2016.shock, { milk_price_c: -12, lines_pct: { feed: 20 } }, "zero rate shift drops out");
assert.equal(t2016.note, "milk −12c/L, feed +20%");
assert.equal(t2016.edited, true);
console.log("shared ok");
console.log("stress tests ok");
