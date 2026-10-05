import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPct } from "@/lib/format/percent";

/**
 * One month's Operating Statement, straight from the engine's pl.months item
 * (expense lines grouped for display only).
 * @param {{ month: { label: string, projected: boolean, detail: {
 *   income: { label: string, amount: number }[], incomeTotal: number,
 *   costs: { label: string, amount: number }[], costsTotal: number,
 *   surplus: number, marginPct: number, loanRepayments: number } } }} props
 */
export default function MonthDetail({ month }) {
  const d = month.detail;
  const row = (label, amount, strong = false) => (
    <div key={label} className={`flex justify-between gap-3 py-1 ${strong ? "font-semibold" : "text-stone-600"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm">
      <p className="mb-3 font-semibold">
        {month.label} {month.projected && <span className="font-normal text-stone-500">· projected</span>}
      </p>
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          {d.income.filter((r) => r.amount > 0).map((r) => row(r.label, r.amount))}
          {row("Income", d.incomeTotal, true)}
        </div>
        <div>
          {d.costs.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount).map((r) => row(r.label, r.amount))}
          {row("Operating costs", d.costsTotal, true)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-3">
        <span className={`font-semibold ${d.surplus < 0 ? "text-red-700" : ""}`}>
          Operating Surplus {formatCurrency(d.surplus)}{" "}
          <span className="font-normal text-stone-500">({formatMarginPct(d.marginPct, 0)} margin)</span>
        </span>
        <span className="text-stone-500">Loan repayments {formatCurrency(d.loanRepayments)} (outside surplus)</span>
      </div>
    </div>
  );
}
