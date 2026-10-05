// Self-check for the Biddy figure helpers: `npm run check`.
import assert from "node:assert/strict";
import { fillTemplate, unverifiedFigures, valueAt } from "../lib/biddy-figures.js";

const response = { status: "ok", result: { closing_cash: 150263.65, months: [{ closing_cash: -8274.08 }], ytd: { margin_pct: 46.72 } } };

assert.equal(valueAt(response, "result.months[0].closing_cash"), -8274.08);
assert.equal(valueAt(response, "result.nope[3].x"), undefined);

const { text, figures_used } = fillTemplate("Dec {result.closing_cash}, low {result.months[0].closing_cash}, {result.ytd.margin_pct|pct}, {result.missing}", response);
assert.equal(text, "Dec €150,264, low -€8,274, 47%, —");
assert.equal(figures_used.length, 3);

const answer = { results: [{ response }], figures_used };
assert.deepEqual(unverifiedFigures(answer), []);
assert.equal(unverifiedFigures({ ...answer, figures_used: [{ result: 0, path: "result.closing_cash", value: 1 }] }).length, 1);

console.log("biddy figures ok");
