import { labelForRevenue } from "@/lib/financial-engine/mapResult";
import { formatCurrency } from "@/lib/format/currency";
import { COLORS } from "@/components/ui";

// View-only grouping of engine cost lines. ponytail: dairy-shaped; move to GET /v1/enterprises when it ships.
const EXPENSE_GROUPS = [
  ["Feed", ["feed"]],
  ["Labour", ["labour"]],
  ["Fertiliser", ["fertiliser"]],
  ["Contractor", ["contractor"]],
  ["Vet & breeding", ["vet"]],
  ["Machinery & fuel", ["fuel", "repairs_maintenance"]],
  ["Rent & land", ["rent_lease"]],
  ["Utilities", ["electricity", "water"]],
  ["Overheads", ["insurance", "professional_fees", "levies", "other_operating_costs"]],
];

/** Income rows straight from the engine's revenue nest (everything but `total`). */
export function incomeRows(revenue) {
  return Object.entries(revenue)
    .filter(([key]) => key !== "total")
    .map(([key, amount]) => ({ label: labelForRevenue(key), amount }));
}

/** Expense rows: engine cost lines grouped for display; unknown lines land in "Other". */
export function expenseRows(lines) {
  const grouped = new Set(EXPENSE_GROUPS.flatMap(([, keys]) => keys));
  const rest = Object.keys(lines).filter((k) => !grouped.has(k));
  return [...EXPENSE_GROUPS, ["Other", rest]].map(([label, keys]) => ({
    label,
    amount: keys.reduce((sum, k) => sum + (lines[k] ?? 0), 0),
  }));
}

/** Ranked horizontal bars; the total shown is the engine-published total. */
export default function Breakdown({ rows, total, color = COLORS.income, currency }) {
  const visible = rows.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{formatCurrency(total, currency)}</p>
      <ul className="mt-4 space-y-3">
        {visible.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-stone-700">{r.label}</span>
              <span className="tabular-nums font-medium">{formatCurrency(r.amount, currency)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-stone-100">
              <div className="h-2 rounded-full" style={{ width: `${(r.amount / total) * 100}%`, background: color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
