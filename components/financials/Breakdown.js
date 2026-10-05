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

// Validated categorical order. ponytail: 3 hues; a 4th+ source reuses the last — add validated hues if an enterprise needs more.
const STACK_COLORS = ["#2f7d4f", "#3b5fc0", "#c0508a"];

/** Few rows (e.g. income sources): one stacked bar + labelled legend. Total is the engine's. */
export function StackedBreakdown({ rows, total, currency }) {
  const visible = rows.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  const color = (i) => STACK_COLORS[Math.min(i, STACK_COLORS.length - 1)];

  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{formatCurrency(total, currency)}</p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Income by source">
        {visible.map((r, i) => (
          <div key={r.label} style={{ width: `${(r.amount / total) * 100}%`, background: color(i) }} title={r.label} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {visible.map((r, i) => (
          <li key={r.label} className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color(i) }} />
            <span className="flex-1 text-stone-700">{r.label}</span>
            <span className="tabular-nums font-medium">{formatCurrency(r.amount, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
