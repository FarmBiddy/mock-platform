// Self-check for "Share with my advisor" input (query string / form / cookie): part of `npm run check`.
import assert from "node:assert/strict";
import { cleanShare, cleanShares, safeHref } from "../lib/shared-core.js";

assert.equal(safeHref("/plan?s=base&price=0.42&inv=parlour"), "/plan?s=base&price=0.42&inv=parlour");
assert.equal(safeHref("/farm-financials"), "/farm-financials");
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

console.log("shared ok");
