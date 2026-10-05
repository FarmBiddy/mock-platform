import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { dayLabel, monthLabel } from "@/lib/format/date";

/** @param {{ response: import("@/lib/financial-engine/client").EngineResponse<import("@/lib/financial-engine/client").LoanScheduleResult> }} props */
export function LoansCard({ response }) {
  return (
    <Card title="Loans & Repayments" subtitle="Not an operating cost — shown here and in cash flow" badge={<Badge tone="soon">Coming soon · loan.schedule</Badge>}>
      <EngineGate response={response}>
        {(r) => (
          <>
            <div className="mb-4 flex gap-6 text-sm">
              <Stat label="Outstanding" value={formatCurrency(r.total_balance, r.currency)} />
              <Stat label="Monthly repayments" value={formatCurrency(r.total_monthly_payment, r.currency)} />
            </div>
            <ul className="space-y-3">
              {r.loans.map((l) => (
                <li key={l.id} className="rounded-xl bg-stone-50 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{l.name}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(l.balance, r.currency)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {l.lender} · {l.rate_pct}% · ends {monthLabel(l.end.month)} {l.end.year}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">
                    Next: {formatCurrency(l.next_payment.total, r.currency)} on {monthLabel(l.next_payment.month)} (
                    {formatCurrency(l.next_payment.principal, r.currency)} principal + {formatCurrency(l.next_payment.interest, r.currency)} interest)
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </EngineGate>
    </Card>
  );
}

export function SupplierDebtCard({ data }) {
  return (
    <Card title="Outstanding Supplier Debt" badge={<Badge tone="platform">Platform · mock</Badge>}>
      <div className="mb-4 flex gap-6 text-sm">
        <Stat label="Total owed" value={formatCurrency(data.total_outstanding, data.currency)} />
        <Stat label="Overdue" value={formatCurrency(data.overdue, data.currency)} danger={data.overdue > 0} />
      </div>
      <ul className="divide-y divide-stone-100 text-sm">
        {data.suppliers.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className={`text-xs ${s.overdue ? "font-medium text-red-700" : "text-stone-500"}`}>
                {s.overdue ? "Overdue since" : "Due"} {dayLabel(s.due_date)} · {s.category}
              </p>
            </div>
            <span className="tabular-nums font-medium">{formatCurrency(s.balance, data.currency)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

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
