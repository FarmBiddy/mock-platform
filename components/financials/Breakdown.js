import { labelForCost, labelForRevenue } from "@/lib/financial-engine/mapResult";

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

/** Expense rows: engine cost lines grouped for display (each keeps its lines); unknown lines land in "Other". */
export function expenseRows(lines) {
  const grouped = new Set(EXPENSE_GROUPS.flatMap(([, keys]) => keys));
  const rest = Object.keys(lines).filter((k) => !grouped.has(k));
  return [...EXPENSE_GROUPS, ["Other", rest]].map(([label, keys]) => ({
    label,
    amount: keys.reduce((sum, k) => sum + (lines[k] ?? 0), 0),
    lines: keys.map((k) => ({ label: labelForCost(k), amount: lines[k] ?? 0 })).filter((l) => l.amount > 0),
  }));
}
