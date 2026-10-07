// Self-check for farmer edits (untrusted cookie / form input): part of `npm run check`.
import assert from "node:assert/strict";
import { applyEdits, cleanEdits, effectiveValue, ownerOf, valueAtPath } from "../lib/farm-edits-core.js";

// whitelist + validation
assert.deepEqual(
  cleanEdits({
    opening_cash: -5000, // signed allowed
    milking_cows: null, // may be cleared
    hectares: null, // may not be cleared
    "months.9.lines.feed": 6000,
    "months.9.lines.feed_typo": 1, // not whitelisted
    "months.13.lines.feed": 1, // no such month
    "months.9.pl.milk_price": -0.4, // negative not allowed
    __proto__: { polluted: 1 },
    "constructor.prototype.x": 1,
    "market.milk_price": "0.5", // strings rejected
  }),
  { opening_cash: -5000, milking_cows: null, "months.9.lines.feed": 6000 },
);
assert.deepEqual(cleanEdits([1, 2]), {});
assert.deepEqual(cleanEdits(null), {});

// applying
const base = { opening_cash: 45000, milking_cows: 100, months: [{ month: 9, pl: { milk_price: 0.5 }, lines: { feed: 5500 }, cash: {} }] };
const farm = applyEdits(base, { "months.9.pl.milk_price": 0.4, "months.9.lines.vet": 300, milking_cows: null, "market.milk_price": 0.46 });
assert.equal(farm.months[0].pl.milk_price, 0.4);
assert.equal(farm.months[0].lines.vet, 300);
assert.equal(farm.milking_cows, null);
assert.equal(farm.market.milk_price, 0.46);
assert.equal(base.months[0].pl.milk_price, 0.5, "base must not change");
assert.equal(valueAtPath(base, "months.9.lines.feed"), 5500);
assert.equal(({}).polluted, undefined);


// who edits what: farmer records vs advisor assumptions
assert.equal(ownerOf("months.9.lines.feed"), "owner");
assert.equal(ownerOf("opening_cash"), "owner");
assert.equal(ownerOf("market.milk_price"), "advisor");
assert.equal(ownerOf("new_loan_terms.min_cover"), "advisor");
assert.equal(ownerOf("market.milk_price.x"), "owner"); // not an assumption path (and not whitelisted)

// plan presets (advisor): range-checked, listed preset keys only
assert.deepEqual(
  cleanEdits({
    "plan_presets.base.assumptions.milk_price.0": 0.45,
    "plan_presets.base.assumptions.milk_price.1": 45, // cents typed as euros: out of range
    "plan_presets.base.assumptions.milk_price.3": 0.45, // only years 1, 2, 3+
    "plan_presets.cautious.assumptions.cost_inflation_pct": -2,
    "plan_presets.__proto__.assumptions.milk_price.0": 0.45,
    "plan_presets.base.label": 1,
  }),
  { "plan_presets.base.assumptions.milk_price.0": 0.45, "plan_presets.cautious.assumptions.cost_inflation_pct": -2 },
);
assert.equal(ownerOf("plan_presets.base.assumptions.milk_price.2"), "advisor");
const plan = { plan_presets: { base: { assumptions: { milk_price: [0.47], cost_inflation_pct: [2, 2, 2, 2, 2] } } } };
const tuned = applyEdits(plan, { "plan_presets.base.assumptions.milk_price.0": 0.44, "plan_presets.base.assumptions.cost_inflation_pct": 3 });
assert.deepEqual(tuned.plan_presets.base.assumptions.milk_price, [0.44, 0.47, 0.47], "year 1 only; later years keep 47c");
assert.deepEqual(tuned.plan_presets.base.assumptions.cost_inflation_pct, [3, 3, 3, 3, 3]);
assert.equal(effectiveValue(plan, "plan_presets.base.assumptions.milk_price.2"), 0.47, "carries forward");
assert.equal(effectiveValue(plan, "plan_presets.base.assumptions.cost_inflation_pct"), 2);
assert.deepEqual(plan.plan_presets.base.assumptions.milk_price, [0.47], "base must not change");

console.log("farm edits ok");
