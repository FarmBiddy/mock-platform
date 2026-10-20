/**
 * Reads an accountant's financial statements and tax computation (text from the PDF, one string per page) into
 * the farm edits the platform already understands, so every page and the engine use them. Pure: `npm run check`
 * tests it against the demo PDF's text.
 *
 * ponytail: label matching for one accountant's layout (the demo pack). Real packs vary by firm; production would
 * read them with a document model and show the farmer the same review step.
 */
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, "").replace(/^\((.*)\)$/, "-$1")));
/** Names as accountants and farmers write them: "&" and "and", spacing and case don't matter. */
const same = (s) => s.toLowerCase().replace(/&/g, "and").replace(/^the /, "").replace(/\s+/g, " ").trim();
const ALLOWANCE = { "farm buildings": "farm_buildings", "plant and machinery": "plant" };

/**
 * @param {string[]} pages  text per page
 * @param {{ year: number, assets?: { id: string, name: string }[] }} farm  the farm it's for (this year, its asset register)
 * @returns {{ year: number | null, found: { group: string, label: string, value: string, path?: string }[], edits: object, skipped: string[] }}
 */
export function readAccounts(pages, farm) {
  const all = pages.join("\n");
  const flat = all.replace(/\s+/g, " ");
  const get = (re, text = all) => text.match(re);
  const found = [];
  const edits = {};
  const skipped = [];
  const add = (group, label, value, path, edit) => {
    found.push({ group, label, value, ...(path ? { path } : {}) });
    if (path) edits[path] = edit;
  };
  const eur = (v) => `€${Math.abs(v).toLocaleString("en-IE")}${v < 0 ? " loss" : ""}`;

  const year = num(get(/year ended 31 December (\d{4})/)?.[1]);
  if (!year) return { year: null, found, edits, skipped: ["This doesn’t look like a set of farm accounts (no “year ended 31 December”)."] };

  // How the farm is set up: tax.estimate's profile
  const structure = get(/Business structure (Sole trader|Limited company|Partnership)/)?.[1];
  if (structure === "Partnership") skipped.push("Partnership accounts: partnerships come later.");
  else if (structure) add("Tax details", "How the farm is set up", structure, "tax.business_type", structure === "Sole trader" ? "sole_trader" : "company");
  const assessment = get(/Assessment (Joint assessment|Single|Separate assessment)/)?.[1];
  if (assessment) add("Tax details", "Married or civil partners?", assessment === "Single" ? "No" : `Yes (${assessment.toLowerCase()})`, "tax.marital_status", assessment === "Single" ? "single" : "married");
  const spouse = get(/Spouse ([^\n,]+), (no PAYE income|PAYE income of €([\d,]+))/);
  if (spouse) add("Tax details", `${spouse[1]}’s wages`, spouse[3] ? `€${spouse[3]}` : "None", "tax.spouse_paye_income", spouse[3] ? num(spouse[3]) : 0);
  const vat = get(/VAT status (Not registered|Registered)/)?.[1];
  if (vat) add("Tax details", "VAT", vat === "Registered" ? "Registered" : "Not registered (flat-rate farmer)", "tax.vat", vat === "Registered" ? "registered" : "flat_rate");

  // The year-end balance sheet is this year's start, if the accounts are for last year
  const startsThisYear = year === farm.year - 1;
  const opening = `Start of ${year + 1} (your 31 Dec ${year} balance sheet)`;
  const cash = num(get(/Cash at bank ([\d,()]+)/)?.[1]);
  const livestock = get(/^Livestock ([\d,]+) ([\d,]+)$/m);
  const stock = get(/^Stock of feed, fertiliser and fuel ([\d,]+) ([\d,]+)$/m);
  if (!startsThisYear) skipped.push(`These are ${year} accounts, so their closing balances aren’t the start of ${farm.year}.`);
  else {
    if (cash != null) add(opening, `Bank balance on 1 Jan ${year + 1}`, eur(cash), "opening_cash", cash);
    if (livestock) add(opening, "Value of your herd", eur(num(livestock[2])), "balance_sheet.livestock_opening_value", num(livestock[2]));
    if (stock) add(opening, "Value of feed, fertiliser and fuel in stock", eur(num(stock[2])), "balance_sheet.stock_opening_value", num(stock[2]));
  }

  // Buildings and machinery: grants and the allowance each is claimed under, matched to the asset register by name
  const register = new Map((farm.assets ?? []).map((a) => [a.name.toLowerCase(), a.id]));
  const grantsFor = [...all.matchAll(/The (.+?) received a TAMS grant of €([\d,]+)/g)];
  for (const [, name, amount] of grantsFor) {
    const id = [...register].find(([n]) => same(n) === same(name))?.[1];
    if (id) add("Buildings and machinery", `TAMS grant: ${name}`, `€${amount}`, `tax.grant.${id}`, num(amount));
    else skipped.push(`TAMS grant on “${name}”: that isn’t on your asset list yet.`);
  }
  for (const [name, id] of register) {
    const type = flat.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (Farm buildings|Plant and machinery)`, "i"))?.[1];
    if (type) add("Buildings and machinery", `Allowance: ${(farm.assets.find((a) => a.id === id) ?? {}).name}`, type, `tax.allowance.${id}`, ALLOWANCE[type.toLowerCase()]);
  }

  // Last year's tax: a check on the estimate, and the accountant's figure for lenders
  const taxable = num(get(/^Taxable profit ([\d,()]+)$/m)?.[1]);
  const total = get(/Total tax liability (\d{4}) ([\d,]+)/);
  if (taxable != null) add(`Your ${year} tax`, "Taxable profit", eur(taxable), "tax.last_year_taxable_profit", taxable);
  if (total) {
    add(`Your ${year} tax`, "Total tax", eur(num(total[2])), "tax.last_year_tax", num(total[2]));
    add(`Your ${year} tax`, "Tax figure from your accountant (used for borrowing)", `${eur(num(total[2]))} a year`, "household.tax_per_year", num(total[2]));
  }
  // Profits for income averaging (the plan's tax, later)
  const averaging = all.split(/Farming profits for income averaging/)[1] ?? "";
  for (const [, y, v] of averaging.matchAll(/^(\d{4}) ([\d,()]+)$/gm)) add("Profits for income averaging", y, eur(num(v)), `tax.prior_profit.${y}`, num(v));
  const averagingElected = get(/Income averaging (has not been|has been|is) elected/)?.[1];
  if (averagingElected) {
    const elected = averagingElected !== "has not been";
    add("Profits for income averaging", "Income averaging", elected ? "Elected" : "Not elected", "tax.income_averaging", elected ? "elected" : "not_elected");
  }
  if (found.length) edits["tax.last_year"] = year;
  return { year, found, edits, skipped };
}
