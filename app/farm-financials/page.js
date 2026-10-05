import { Badge, Card, COLORS } from "@/components/ui";
import EngineGate, { withProvided } from "@/components/financials/EngineGate";
import MonthlyChart from "@/components/financials/MonthlyChart";
import CashChart from "@/components/financials/CashChart";
import Breakdown, { StackedBreakdown, expenseRows, incomeRows } from "@/components/financials/Breakdown";
import { EventsCard, LoansCard, Stat, SupplierDebtCard } from "@/components/financials/PlatformCards";
import StatusTiles from "@/components/financials/StatusTiles";
import SourcesToggle from "@/components/SourcesToggle";
import { cfMonths, loanSchedule, plMonths } from "@/lib/financial-engine/client";
import { buildCfMonthsInput, buildLoanScheduleInput, buildPlMonthsInput, getFarm, isProjected } from "@/lib/financials/farm";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

export const metadata = { title: "Farm Financials · FarmBiddy" };

/**
 * Farm Financials. Platform data → Financial Engine → display.
 * Every money figure on this page is engine-published (grouping for display only).
 */
export default async function FarmFinancialsPage({ searchParams }) {
  const params = await searchParams;
  const farm = getFarm();

  const run = (fn, call, input) => call(withProvided(fn, params, input));

  // Order matters: projected loan repayments come from loan.schedule, projected milk cheques from pl.months.
  const loans = await run("loan.schedule", loanSchedule, buildLoanScheduleInput(farm));
  const loanResult = loans.status === "ok" ? loans.result : null;
  // P&L still runs without loans: repayments sit outside Operating Surplus, so surplus figures stay right.
  const pl = await run("pl.months", plMonths, buildPlMonthsInput(farm, loanResult));
  const cf =
    pl.status !== "ok"
      ? { status: "error", error: { code: "needs_pl", message: "Cash flow needs the monthly P&L first." } }
      : !loanResult
        ? { status: "error", error: { code: "needs_loans", message: "Cash flow needs the loan schedule first." } }
        : await run("cf.months", cfMonths, buildCfMonthsInput(farm, pl.result, loanResult));

  const asOf = monthLabel(farm.actual_through_month);
  // Say which month / loan a nested needs_input path points at (index = position in our request).
  const describePath = (path) => {
    const [, list, i] = path.match(/^(\w+)\[(\d+)\]/) ?? [];
    if (list === "months") return farm.months[i] && monthLabel(farm.months[i].month);
    if (list === "loans") return farm.loans[i]?.name;
    return null;
  };
  const tag = (m) => ({ label: monthLabel(m.period.month), projected: isProjected(farm, m.period.month) });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farm Financials</h1>
          <p className="text-sm text-stone-500">
            {farm.profile.farm_name} · {farm.year} · actuals to end of {asOf}, budget after
          </p>
        </div>
        <SourcesToggle />
      </div>

      <StatusTiles pl={pl} cf={cf} loans={loans} farm={farm} />

      <EngineGate response={pl} params={params} describePath={describePath}>
        {({ months }) => (
          <Card
            title="Operating Surplus by month"
            subtitle="Income minus operating costs, Jan–Dec. Hatched months after “Today” are projected from your budget and market prices."
            badge={<Badge>pl.months</Badge>}
          >
            <MonthlyChart
              data={months.map((m) => ({
                ...tag(m),
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
              }))}
            />
          </Card>
        )}
      </EngineGate>

      <Card title="Cash in the bank, month by month" subtitle="Month-end balance incl. loan repayments and machinery spend" badge={<Badge>cf.months</Badge>}>
        <EngineGate response={cf} params={params} describePath={describePath}>
          {(r) => {
            const now = r.months.find((m) => m.period.month === farm.actual_through_month);
            const lowest = r.months.reduce((a, b) => (b.closing_cash < a.closing_cash ? b : a));
            return (
              <>
                <div className="mb-4 flex flex-wrap gap-8">
                  <Stat label={`Balance end of ${asOf}`} value={formatCurrency(now?.closing_cash, r.currency)} />
                  <Stat
                    label="Lowest point this year"
                    value={formatCurrency(lowest.closing_cash, r.currency)}
                    danger={lowest.closing_cash < 0}
                    hint={`${monthLabel(lowest.period.month)}${isProjected(farm, lowest.period.month) ? " (projected)" : ""}`}
                  />
                  <Stat label="Projected 31 Dec" value={formatCurrency(r.closing_cash, r.currency)} />
                </div>
                <CashChart
                  data={r.months.map((m) => ({
                    ...tag(m),
                    closing: m.closing_cash,
                    cashIn: m.cash_in,
                    cashOut: m.cash_out,
                  }))}
                />
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-emerald-800 hover:underline">Show month by month</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[32rem] tabular-nums">
                      <thead className="text-left text-xs text-stone-500">
                        <tr>
                          <th className="py-1 font-medium">Month</th>
                          <th className="py-1 text-right font-medium">Cash in</th>
                          <th className="py-1 text-right font-medium">Cash out</th>
                          <th className="py-1 text-right font-medium">Net</th>
                          <th className="py-1 text-right font-medium">Month-end</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {r.months.map((m) => {
                          const { label, projected } = tag(m);
                          return (
                            <tr key={label} className={projected ? "text-stone-500" : ""}>
                              <td className="py-1.5">
                                {label}
                                {projected && <span className="ml-1 text-xs">(proj.)</span>}
                              </td>
                              <td className="py-1.5 text-right">{formatCurrency(m.cash_in, r.currency)}</td>
                              <td className="py-1.5 text-right">{formatCurrency(m.cash_out, r.currency)}</td>
                              <td className={`py-1.5 text-right ${m.net_cash_flow < 0 ? "text-red-700" : ""}`}>{formatCurrency(m.net_cash_flow, r.currency)}</td>
                              <td className={`py-1.5 text-right font-medium ${m.closing_cash < 0 ? "text-red-700" : ""}`}>{formatCurrency(m.closing_cash, r.currency)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t border-stone-200 font-semibold">
                        <tr>
                          <td className="py-1.5">Year</td>
                          <td className="py-1.5 text-right">{formatCurrency(r.cash_in, r.currency)}</td>
                          <td className="py-1.5 text-right">{formatCurrency(r.cash_out, r.currency)}</td>
                          <td className="py-1.5 text-right">{formatCurrency(r.net_cash_flow, r.currency)}</td>
                          <td className="py-1.5 text-right">{formatCurrency(r.closing_cash, r.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              </>
            );
          }}
        </EngineGate>
      </Card>

      {/* Two balanced columns: short income + loans on the left, the long expense list on the right. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {pl.status === "ok" && (
            <Card title="Income YTD" subtitle={`Jan–${asOf}`} badge={<Badge>pl.months · ytd</Badge>}>
              <StackedBreakdown rows={incomeRows(pl.result.ytd.revenue)} total={pl.result.ytd.revenue.total} currency={pl.result.currency} />
            </Card>
          )}
          <LoansCard response={loans} loans={farm.loans} params={params} describePath={describePath} />
        </div>
        {pl.status === "ok" && (
          <Card title="Expenses YTD" subtitle={`Operating costs, Jan–${asOf}. Loan repayments excluded.`} badge={<Badge>pl.months · ytd</Badge>}>
            <Breakdown rows={expenseRows(pl.result.ytd.costs.lines)} total={pl.result.ytd.costs.total} color={COLORS.costs} currency={pl.result.currency} />
          </Card>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <EventsCard data={farm.events} />
        <SupplierDebtCard data={farm.suppliers} />
      </div>
    </div>
  );
}
