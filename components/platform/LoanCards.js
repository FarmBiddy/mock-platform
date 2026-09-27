import { formatCurrency } from "@/lib/format/currency";
import { MOCK_LOANS } from "@/data/platform-mocks/loans";

/** Platform mock — not from Financial Engine. */
export default function LoanCards() {
  return (
    <section className="space-y-3">
      <Header title="Loans" note="Platform mock" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {MOCK_LOANS.map((loan) => (
          <li
            key={loan.id}
            className="rounded border border-stone-200 bg-white p-4"
          >
            <p className="font-medium text-stone-900">{loan.name}</p>
            <p className="text-xs text-stone-500">{loan.lender}</p>
            <p className="mt-3 text-lg font-semibold tabular-nums text-stone-900">
              {formatCurrency(loan.balance)}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              {loan.rateLabel} · {loan.nextPaymentLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Header({ title, note }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <span className="text-[10px] uppercase tracking-wider text-stone-400">
        {note}
      </span>
    </div>
  );
}
