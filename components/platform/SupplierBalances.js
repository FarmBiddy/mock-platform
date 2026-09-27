import { formatCurrency } from "@/lib/format/currency";
import { MOCK_SUPPLIERS } from "@/data/platform-mocks/suppliers";

/** Platform mock — not from Financial Engine. */
export default function SupplierBalances() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">
          Supplier balances
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          Platform mock
        </span>
      </div>
      <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white">
        {MOCK_SUPPLIERS.map((supplier) => (
          <li
            key={supplier.id}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-stone-900">{supplier.name}</p>
              <p className="text-xs text-stone-500">{supplier.dueLabel}</p>
            </div>
            <p className="tabular-nums font-medium text-stone-900">
              {formatCurrency(supplier.balance)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
