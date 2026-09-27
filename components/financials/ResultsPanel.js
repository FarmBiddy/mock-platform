import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPct } from "@/lib/format/percent";
import { mapEngineResultForDisplay } from "@/lib/financial-engine/mapResult";

/**
 * Displays engine-published annual Operating Statement fields.
 * Values come from the Financial Engine response only.
 */
export default function ResultsPanel({ result }) {
  const view = mapEngineResultForDisplay(result);

  if (!view) {
    return (
      <div className="rounded border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
        Submit the form to calculate annual Farm Financials via the Financial
        Engine. Results appear here — this app does not calculate them.
      </div>
    );
  }

  const currency = view.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">
          Annual Operating Statement
        </h2>
        <p className="text-xs uppercase tracking-wide text-stone-500">
          {view.period} · {currency}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Operating Income
        </h3>
        <p className="text-2xl font-semibold text-emerald-900">
          {formatCurrency(view.operatingIncome, currency)}
        </p>
        <ul className="divide-y divide-stone-200 text-sm">
          <Line label="Milk" amount={view.milk} currency={currency} />
          <Line label="Schemes" amount={view.schemes} currency={currency} />
          <Line
            label="Other income"
            amount={view.otherRevenue}
            currency={currency}
          />
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Operating Costs
        </h3>
        <p className="text-2xl font-semibold text-stone-900">
          {formatCurrency(view.operatingCosts, currency)}
        </p>
        <ul className="divide-y divide-stone-200 text-sm">
          {view.costLines.map((line) => (
            <Line
              key={line.key}
              label={line.label}
              amount={line.amount}
              currency={currency}
            />
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-stone-200 pt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Operating Surplus
        </h3>
        <p className="text-2xl font-semibold text-emerald-900">
          {formatCurrency(view.operatingSurplus, currency)}
        </p>
        <p className="text-sm text-stone-600">
          Operating Surplus Margin:{" "}
          <span className="font-medium text-stone-900">
            {formatMarginPct(view.marginPct)}
          </span>
        </p>
      </section>

      <section className="space-y-2 border-t border-stone-200 pt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Finance
        </h3>
        <div className="flex items-center justify-between gap-4 text-base font-medium text-stone-900">
          <span>Loan repayments</span>
          <span className="tabular-nums">
            {formatCurrency(view.loanRepayments, currency)}
          </span>
        </div>
        <p className="text-xs text-stone-500">
          Loan repayments are reported separately and do not reduce Operating
          Surplus.
        </p>
      </section>
    </div>
  );
}

function Line({ label, amount, currency }) {
  return (
    <li className="flex items-center justify-between gap-4 py-1.5 text-stone-700">
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount, currency)}</span>
    </li>
  );
}
