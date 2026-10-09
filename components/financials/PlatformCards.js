import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPct } from "@/lib/format/percent";
import { dayLabel, monthLabel } from "@/lib/format/date";

/** "Paid off by Jun 2029" from the last month of the engine's schedule. */
const paidOffBy = (l) => {
  const end = l.months.at(-1)?.period;
  return end ? `${monthLabel(end.month)} ${end.year}` : "—";
};

/**
 * "Your loans" from loan.schedule, in plain words: how much is owed, when each loan is paid off,
 * what fixed / variable means, and how each payment splits between paying down the loan and the
 * bank's charge (interest). Engine results are in the same order as the platform's `loans`
 * (which holds names, lenders, rate type).
 * @param {{ response: import("@/lib/financial-engine/client").EngineResponse<import("@/lib/financial-engine/client").LoanScheduleResult>, loans: object[], params?: object }} props
 */
export function LoansCard({ response, loans, params, describePath }) {
  return (
    <Card title="Your loans" subtitle="What you owe, when it’s paid off, and where each payment goes" badge={<Badge>loan.schedule</Badge>}>
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <>
            <p className="text-sm text-stone-700">
              You owe <strong>{formatCurrency(r.total_balance, r.currency)}</strong> across {r.loans.length} loan{r.loans.length === 1 ? "" : "s"} and pay{" "}
              <strong>{formatCurrency(r.total_monthly_payment, r.currency)} a month</strong> in total.
            </p>
            <ul className="mt-4 space-y-3">
              {r.loans.map((l, i) => {
                const meta = loans[i];
                const next = l.months[0];
                const variable = meta.rate_type === "Variable";
                return (
                  <li key={meta.id} className="rounded-xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200/60">
                    <div className="flex flex-wrap justify-between gap-x-3">
                      <span className="font-medium">{meta.name}</span>
                      <span className="text-xs text-stone-500">{meta.lender}</span>
                    </div>
                    {l.repaid_pct != null ? (
                      <div className="mt-2">
                        <div className="h-2 rounded-full bg-stone-200">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${l.repaid_pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-stone-600">
                          <strong>{formatMarginPct(l.repaid_pct, 0)} paid off</strong> · {formatCurrency(l.balance, r.currency)} still to pay
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-stone-600">
                        <strong>{formatCurrency(l.balance, r.currency)}</strong> still to pay
                      </p>
                    )}
                    <p className="mt-2 text-xs text-stone-600">
                      📅 <strong>Paid off by {paidOffBy(l)}</strong>, then about {formatCurrency(l.monthly_payment, r.currency)} a month is free again.
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {variable ? "〰" : "🔒"} <strong>{variable ? "Variable" : "Fixed"} rate, {formatRate(l.annual_rate)} a year:</strong>{" "}
                      {variable ? "your payment can go up or down if bank rates change." : "your payment stays the same until the end."}
                    </p>
                    {next && (
                      <div className="mt-2">
                        <p className="text-xs text-stone-600">
                          <strong>
                            {monthLabel(next.period.month)} payment: {formatCurrency(next.payment, r.currency)}
                          </strong>
                        </p>
                        {/* bar split: share of the payment that pays down the loan vs the bank's charge */}
                        <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-stone-200">
                          <div className="bg-emerald-600" style={{ width: `${(next.principal / next.payment) * 100}%` }} />
                          <div className="bg-amber-400" style={{ width: `${(next.interest / next.payment) * 100}%` }} />
                        </div>
                        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-stone-600">
                          <span>
                            <span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-600" />
                            {formatCurrency(next.principal, r.currency)} pays down the loan
                          </span>
                          <span>
                            <span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
                            {formatCurrency(next.interest, r.currency)} is the bank’s charge (interest)
                          </span>
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Bank charges (interest) still to pay on these loans: <strong>{formatCurrency(r.total_interest, r.currency)}</strong>
            </p>
          </>
        )}
      </EngineGate>
    </Card>
  );
}

const formatRate = (rate) => `${(rate * 100).toLocaleString("en-IE", { maximumFractionDigits: 2 })}%`;


export function EventsCard({ data }) {
  return (
    <Card title={`Upcoming Financial Events · ${monthLabel(data.month)}`} badge={<Badge tone="platform">Platform · mock</Badge>}>
      <div className="mb-4 flex gap-6 text-sm">
        <Stat label="Money in" value={formatCurrency(data.total_in, data.currency)} />
        <Stat label="Money out" value={formatCurrency(data.total_out, data.currency)} />
      </div>
      <ul className="divide-y divide-stone-100 text-sm">
        {data.events.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-3">
              <span className="w-12 text-xs text-stone-500">{dayLabel(e.date)}</span>
              <span>{e.title}</span>
            </div>
            <span className={`shrink-0 whitespace-nowrap tabular-nums font-medium ${e.direction === "in" ? "text-emerald-700" : "text-stone-800"}`}>
              {e.direction === "in" ? "+" : "−"}
              {formatCurrency(e.amount, data.currency)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Stat({ label, value, danger = false, hint }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${danger ? "text-red-700" : ""}`}>{value}</p>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
