import { expenseRows, incomeRows } from "@/components/financials/Breakdown";
import { isProjected } from "@/lib/financials/farm";
import { monthLabel } from "@/lib/format/date";

/** Chart rows from engine results. Picks published fields only — no maths. Shared by the page and chats. */

const tag = (farm, m) => ({ label: monthLabel(m.period.month), projected: isProjected(farm, m.period.month) });

/** pl.months `months` → MonthlyChart data (with per-month statement for the detail panel). */
export const surplusChartData = (farm, months) =>
  months.map((m) => ({
    ...tag(farm, m),
    income: m.revenue.total,
    costs: m.costs.total,
    surplus: m.profit.net,
    detail: {
      income: incomeRows(m.revenue),
      incomeTotal: m.revenue.total,
      costs: expenseRows(m.costs.lines),
      costsTotal: m.costs.total,
      surplus: m.profit.net,
      marginPct: m.profit.margin_pct,
      loanRepayments: m.finance.loan_repayments,
    },
  }));

/** cf.months `months` → CashChart data. */
export const cashChartData = (farm, months) =>
  months.map((m) => ({ ...tag(farm, m), closing: m.closing_cash, cashIn: m.cash_in, cashOut: m.cash_out }));

/** cf.months `months` → CashflowChart data: money in, money out and what was left each month. */
export const cashflowChartData = (farm, months) =>
  months.map((m) => ({ ...tag(farm, m), moneyIn: m.cash_in, moneyOut: m.cash_out, left: m.net_cash_flow }));

/** Plain-words groups for the money-in / money-out breakdowns (engine cash line keys). Anything else → "Other". */
const MONEY_IN = [
  ["Milk", ["milk"]],
  ["Cattle sales", ["cattle_sales"]],
  ["Schemes and grants", ["biss", "acres", "other_grants"]],
];
const MONEY_OUT = [
  ["Feed", ["feed"]],
  ["Wages and labour", ["labour"]],
  ["Fertiliser and lime", ["fertiliser"]],
  ["Contractors", ["contractor"]],
  ["Vet", ["vet"]],
  ["Machinery, fuel and repairs", ["machinery_equipment_payments", "fuel", "repairs_maintenance"]],
  ["Loan repayments", ["loan_principal_repayments", "interest_paid"]],
  ["Family drawings", ["household_drawings"]],
];

/**
 * cf.compare result → rows for "Where your money came from / went": each engine line's amount so far
 * (`actual`), gathered under a plain label. View-only grouping, like expenseRows; totals shown are the engine's.
 * @param {"in" | "out"} side
 */
export function moneyRows(result, side) {
  const key = side === "in" ? "inflows" : "outflows";
  const lines = Object.assign({}, ...["operating", "investing", "financing"].map((a) => result[a]?.[key]?.lines ?? {}));
  const groups = side === "in" ? MONEY_IN : MONEY_OUT;
  const known = new Set(groups.flatMap(([, keys]) => keys));
  const sum = (keys) => keys.reduce((s, k) => s + (lines[k]?.actual ?? 0), 0);
  return [...groups.map(([label, keys]) => ({ label, amount: sum(keys) })), { label: side === "in" ? "Other income" : "Other farm bills", amount: sum(Object.keys(lines).filter((k) => !known.has(k))) }]
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
