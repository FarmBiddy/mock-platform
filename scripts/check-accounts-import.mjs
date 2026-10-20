// Self-check: the demo accounts PDF reads into the farm edits the engine uses. Part of `npm run check`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { readAccounts } from "../lib/accounts-import.js";

const pdf = new Uint8Array(readFileSync(new URL("../public/samples/Bloggs-Farm-Accounts-2025.pdf", import.meta.url)));
const { text } = await extractText(await getDocumentProxy(pdf), { mergePages: false });
const joe = JSON.parse(readFileSync(new URL("../data/farms/joe-bloggs.json", import.meta.url), "utf8"));
const { year, edits, skipped } = readAccounts(text, joe);

assert.equal(year, 2025);
assert.deepEqual(skipped, []);
assert.equal(edits["tax.business_type"], "sole_trader");
assert.equal(edits["tax.marital_status"], "married");
assert.equal(edits["tax.spouse_paye_income"], 0);
assert.equal(edits["tax.vat"], "flat_rate");
assert.equal(edits.opening_cash, joe.opening_cash, "31 Dec 2025 cash = 1 Jan 2026 opening");
assert.equal(edits["balance_sheet.livestock_opening_value"], joe.balance_sheet.livestock_opening_value);
assert.equal(edits["tax.grant.parlour"], 54000, "grant matched though the PDF says 'and' and the register '&'");
assert.equal(edits["tax.allowance.feeder"], "plant");
assert.equal(edits["tax.last_year_tax"], 28392);
assert.equal(edits["tax.prior_profit.2022"], 61240);
// a year the farm isn't starting from: its closing balances are not this year's opening
assert.equal(readAccounts(text, { ...joe, year: 2028 }).edits.opening_cash, undefined);
// not accounts at all
assert.equal(readAccounts(["A shopping list"], joe).year, null);

console.log("accounts import ok");
