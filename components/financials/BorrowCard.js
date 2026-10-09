import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

const pct = (rate) => `${(rate * 100).toLocaleString("en-IE", { maximumFractionDigits: 2 })}%`;
const euros = (v) => `€${v.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const term = (months) => (months % 12 === 0 ? `${months / 12} years` : `${months} months`);

/** One line of the "how we worked it out" ticket. */
function Line({ label, value, sign = "", strong = false, hint }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-stone-200 pt-1.5 font-semibold text-stone-900" : "text-stone-600"}`}>
      <dt>
        {sign && <span className="mr-1 inline-block w-3 text-stone-400">{sign}</span>}
        {label}
        {hint && <span className="block pl-4 text-[11px] font-normal text-stone-400">{hint}</span>}
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * "Could the farm take on a new loan?" from debt.capacity, in plain words: the answer first, then how it
 * was worked out (every line is an engine value), then the bank's safety cushion explained.
 * Never alarming: a "not at the moment" answer is amber with a next step, not a red figure.
 */
export default function BorrowCard({ response, params, describePath }) {
  return (
    <Card title="Could the farm take on a new loan?" subtitle="A guide from this year’s figures, not an offer from a bank" badge={<Badge>debt.capacity</Badge>}>
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => {
          const money = (v) => formatCurrency(v, r.currency);
          const yes = r.new_loan.max_principal > 0;
          const cushion = r.repayment_cover;
          // bar geometry only: the cushion against the bank's minimum, on a scale that shows both
          const scale = Math.max(cushion ?? 0, r.min_cover * 2);
          return (
            <div className="text-sm">
              {yes ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-950 ring-1 ring-emerald-200">
                  <p className="text-lg font-semibold">✅ Yes, up to about {money(r.new_loan.max_principal)}</p>
                  <p className="mt-0.5">
                    That would mean repaying about <strong>{money(r.new_loan.monthly_payment_at_max)} a month</strong> for {term(r.new_loan.term_months)} (at{" "}
                    {pct(r.new_loan.annual_rate)} a year).
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3 text-amber-950 ring-1 ring-amber-200">
                  <p className="text-lg font-semibold">Not at the moment</p>
                  <p className="mt-0.5">
                    After family drawings and tax, the farm’s money is already taken up by the loans you have. A financial advisor can help you look at
                    options.
                  </p>
                </div>
              )}

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
                How we worked it out · {monthLabel(r.from.month)}–{monthLabel(r.to.month)} {r.to.year}, including our forecast
              </p>
              <dl className="mt-2 space-y-1.5 text-xs">
                <Line label="The farm’s money left after farm costs" value={money(r.operating_surplus)} />
                {r.off_farm_income ? <Line sign="+" label="Income from off the farm" value={money(r.off_farm_income)} /> : null}
                <Line sign="−" label="Family drawings" value={money(r.drawings)} />
                <Line sign="−" label="Tax" value={money(r.tax)} />
                <Line strong label="Money available for loan repayments, a year" value={money(r.repayment_capacity)} />
                <Line sign="−" label="Loans you already repay, a year" value={money(r.debt_service)} />
                <Line
                  strong
                  label="Room for new repayments, a month"
                  value={money(r.new_loan.max_monthly_payment)}
                  hint="after keeping the safety cushion banks ask for (below)"
                />
              </dl>

              {cushion != null && (
                <div className="mt-4">
                  <p className="text-xs text-stone-700">
                    <strong>Safety cushion:</strong> for every €1 you repay, you have <strong>{euros(cushion)}</strong> available. Banks usually want at least{" "}
                    <strong>{euros(r.min_cover)}</strong>.{cushion >= r.min_cover ? " ✓" : ""}
                  </p>
                  <div className="relative mt-2 h-2.5 rounded-full bg-stone-200">
                    <div
                      className={`h-2.5 rounded-full ${cushion >= r.min_cover ? "bg-emerald-600" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(cushion / scale, 1) * 100}%` }}
                    />
                    <div className="absolute -top-1 h-4.5 w-0.5 bg-stone-700" style={{ left: `${(r.min_cover / scale) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500" style={{ paddingLeft: `calc(${(r.min_cover / scale) * 100}% - 2.5rem)` }}>
                    bank minimum {euros(r.min_cover)}
                  </p>
                </div>
              )}
            </div>
          );
        }}
      </EngineGate>
    </Card>
  );
}
