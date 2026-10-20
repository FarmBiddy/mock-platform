import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";

const eur = (v) => formatCurrency(v);
const REGIME = { general: "general rate", young_trained_farmer: "young trained farmer rate", registered_partnership: "partnership rate" };
const CAPS = {
  ca_accelerated_cap: "the cap on accelerated allowances",
  stock_relief_ytf_cap: "the young trained farmer relief cap",
  stock_relief_general_cap: "the stock relief cap",
  state_aid_young_farmer_lifetime: "the lifetime young farmer aid limit",
};

/** Before the tax questions are answered: what's still needed, nothing assumed. */
export function TaxQuestions({ year, left }) {
  return (
    <Card title={`Your tax for ${year}`} subtitle="An estimate from the Financial Engine" badge={<Badge>tax.estimate</Badge>}>
      <p className="text-sm text-stone-700">
        To estimate your tax we need a few answers from you: {left.join(", ")}.{" "}
        <Link href="/farm-data" className="font-medium text-emerald-800 underline">
          Answer them, or upload last year’s accounts, in Farm data
        </Link>
      </p>
    </Card>
  );
}

/**
 * The year's tax from the engine's tax chain (lib/financials/tax.js), in the order the engine works it out:
 * profit → taxable profit → stock relief → income tax, USC, PRSI. Every figure is a field of one of the steps.
 */
export default function TaxCard({ tax, year, accountantTax, lastYear }) {
  const failed = ["net", "relief", "estimate"].map((k) => tax[k]).find((r) => r && r.status !== "ok");
  if (failed || !tax.estimate) {
    return (
      <Card title={`Your tax for ${year}`} subtitle="An estimate from the Financial Engine" badge={<Badge>tax.estimate</Badge>}>
        <p className="text-sm text-stone-600">
          Couldn’t work it out yet: {failed?.status === "needs_input" ? `missing ${failed.missing.map((m) => m.field).join(", ")}` : (failed?.error?.message ?? "a step didn’t run")}.
        </p>
      </Card>
    );
  }
  const e = tax.estimate.result;
  const n = tax.net.result;
  const ca = tax.allowances?.status === "ok" ? tax.allowances.result : null;
  const sr = tax.relief.result;
  const company = e.business_type === "company";
  const caps = [...(ca?.caps_not_applied ?? []), ...sr.caps_not_applied].map((c) => CAPS[c] ?? c.replaceAll("_", " "));
  const announced = [ca, sr, e, tax.vat?.result].some((r) => r?.rules_applied?.some((rule) => rule.status === "announced"));
  const row = (label, value, o = {}) => (
    <tr key={label} className={o.strong ? "border-t border-stone-200 font-semibold" : "text-stone-700"}>
      <td className={`py-1 ${o.sub ? "pl-4 text-stone-500" : ""}`}>{label}</td>
      <td className="py-1 pl-3 text-right whitespace-nowrap tabular-nums">{value}</td>
    </tr>
  );

  return (
    <Card
      title={`Your tax for ${year}`}
      subtitle={`An estimate at ${year} Irish tax rates for the whole year (what happened so far plus our forecast). Not tax advice.`}
      badge={<Badge>tax.estimate</Badge>}
    >
      <p className="text-sm text-stone-700">
        About <strong className="tabular-nums">{eur(e.total_tax)}</strong> in {company ? "corporation tax" : "tax"} for {year}
        {e.effective_rate_pct != null && <>, {e.effective_rate_pct.toLocaleString("en-IE", { maximumFractionDigits: 1 })}% of the income it’s worked out on</>}.
      </p>
      {lastYear?.tax != null && (
        <p className="mt-1 text-sm text-stone-700">
          Last year, from your {lastYear.year} accounts: <strong className="tabular-nums">{eur(lastYear.tax)}</strong> in tax on a taxable profit of{" "}
          {eur(lastYear.taxable)}.
        </p>
      )}
      <p className="mt-1 text-xs text-stone-500">
        {accountantTax != null
          ? `Your accountant’s figure on file is ${eur(accountantTax)} a year, and that’s the one we use for how much you could borrow.`
          : "We use this estimate for how much you could borrow. Got a figure from your accountant? Add it in Farm data and we’ll use theirs."}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">From profit to the profit that’s taxed</p>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {row("Profit before tax", eur(n.net_profit_before_tax))}
              {ca && row("Depreciation added back", `+ ${eur(ca.profit_bridge.add_back_depreciation)}`, { sub: true })}
              {ca && ca.profit_bridge.flat_rate_addition > 0 && row("Flat-rate VAT on milk and cattle", `+ ${eur(ca.profit_bridge.flat_rate_addition)}`, { sub: true })}
              {ca && row("Capital allowances on machinery and buildings", `− ${eur(ca.profit_bridge.capital_allowances)}`, { sub: true })}
              {row("Taxable profit", eur(sr.trading_profit), { strong: true })}
              {row(`Stock relief (${REGIME[sr.regime] ?? sr.regime})`, `− ${eur(sr.relief)}`, { sub: true })}
              {row("Profit that’s taxed", eur(sr.profit_after_relief), { strong: true })}
            </tbody>
          </table>
          {!ca && <p className="mt-1 text-xs text-stone-500">No buildings or machinery on record, so no capital allowances.</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">The tax</p>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {company ? (
                row("Corporation tax", eur(e.corporation_tax?.total ?? e.total_tax))
              ) : (
                <>
                  {row("Assessment", e.assessment === "joint" ? "Joint, with your spouse" : "On your own", { sub: true })}
                  {e.income.spouse_paye_income > 0 && row("Your spouse’s wages included", eur(e.income.spouse_paye_income), { sub: true })}
                  {row("Income tax", eur(e.income_tax.net))}
                  {row("after tax credits of", eur(e.income_tax.credits), { sub: true })}
                  {row("USC", eur(e.usc.total))}
                  {row("PRSI", eur(e.prsi.total))}
                </>
              )}
              {row("Total tax", eur(e.total_tax), { strong: true })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-stone-500">
        Uses your herd and stock values from your latest balance sheet as the year-end values.
        {caps.length > 0 && ` Not checked yet: ${caps.join(", ")}.`}
        {announced && " Some rates are Budget announcements, not yet law."} Change your tax details in{" "}
        <Link href="/farm-data" className="underline">
          Farm data
        </Link>
        .
      </p>
    </Card>
  );
}
