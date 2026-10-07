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
