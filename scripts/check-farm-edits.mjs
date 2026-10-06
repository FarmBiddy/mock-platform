// Self-check for farmer edits (untrusted cookie / form input): part of `npm run check`.
import assert from "node:assert/strict";
import { applyEdits, cleanEdits, ownerOf, valueAtPath } from "../lib/farm-edits-core.js";

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

console.log("farm edits ok");
