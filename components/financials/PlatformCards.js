import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPct } from "@/lib/format/percent";
import { dayLabel, monthLabel } from "@/lib/format/date";

/**
 * Loans from loan.schedule. Engine results are in the same order as the platform's
 * `loans` (which holds names, lenders, rate type).
 * @param {{ response: import("@/lib/financial-engine/client").EngineResponse<import("@/lib/financial-engine/client").LoanScheduleResult>, loans: object[], params?: object }} props
 */
export function LoansCard({ response, loans, params, describePath }) {
  return (
    <Card title="Loans & Repayments" subtitle="Not an operating cost — shown here and in cash flow" badge={<Badge>loan.schedule</Badge>}>
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <>
            <div className="mb-4 flex gap-6 text-sm">
              <Stat label="Outstanding" value={formatCurrency(r.total_balance, r.currency)} />
              <Stat label="Monthly repayments" value={formatCurrency(r.total_monthly_payment, r.currency)} />
            </div>
            <ul className="space-y-3">
              {r.loans.map((l, i) => {
                const meta = loans[i];
                const next = l.months[0];
                const end = l.months.at(-1).period;
                return (
                  <li key={meta.id} className="rounded-xl bg-stone-50 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{meta.name}</span>
                      <span className="tabular-nums font-medium">{formatCurrency(l.balance, r.currency)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {meta.lender} · {meta.rate_type} {formatRate(l.annual_rate)} · ends {monthLabel(end.month)} {end.year}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      Next {monthLabel(next.period.month)}: {formatCurrency(next.payment, r.currency)} (
                      {formatCurrency(next.principal, r.currency)} principal + {formatCurrency(next.interest, r.currency)} interest)
                    </p>
                    {l.repaid_pct != null && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                        <div className="h-1.5 flex-1 rounded-full bg-stone-200">
                          <div className="h-1.5 rounded-full bg-emerald-700" style={{ width: `${l.repaid_pct}%` }} />
                        </div>
                        {formatMarginPct(l.repaid_pct, 0)} repaid
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
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
