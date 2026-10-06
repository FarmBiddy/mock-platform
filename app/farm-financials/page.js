import { Badge, Card, COLORS } from "@/components/ui";
import EngineGate, { withProvided } from "@/components/financials/EngineGate";
import MonthlyChart from "@/components/financials/MonthlyChart";
import CashChart from "@/components/financials/CashChart";
import Breakdown, { StackedBreakdown, expenseRows, incomeRows } from "@/components/financials/Breakdown";
import { EventsCard, LoansCard, Stat, SupplierDebtCard } from "@/components/financials/PlatformCards";
import StatusTiles from "@/components/financials/StatusTiles";
import KpiCard from "@/components/financials/KpiCard";
import SourcesToggle from "@/components/SourcesToggle";
import { getFarm, isProjected, runFarm } from "@/lib/financials/farm";
import { cashChartData, surplusChartData } from "@/lib/financials/views";
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

  const { inputs, loans, plf, pl, kpi, cff, cf } = await runFarm(farm, (fn, input) => withProvided(fn, params, input));

  const asOf = monthLabel(farm.actual_through_month);
  // Say which month / loan a nested needs_input path points at, from the request that was sent.
  const describePath = (path, fn) => {
    const [, list, i] = path.match(/^(\w+)\[(\d+)\]/) ?? [];
    if (list === "loans") return farm.loans[i]?.name;
    const item = inputs[fn]?.[list]?.[i];
    return item?.month ? `${monthLabel(item.month)}${item.year !== farm.year ? ` ${item.year}` : ""}` : null;
  };
  const forecastIssue = [plf, cff].find((r) => r && r.status !== "ok");
  const tag = (m) => ({ label: monthLabel(m.period.month), projected: isProjected(farm, m.period.month) });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farm Financials</h1>
          <p className="text-sm text-stone-500">
            {farm.profile.farm_name} · {farm.year} · actuals to end of {asOf}, forecast after
          </p>
        </div>
        <SourcesToggle />
      </div>

      {forecastIssue && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Showing actual months only — the forecast couldn’t run ({forecastIssue.error?.message ?? "missing figures"}).
        </p>
      )}

      <StatusTiles pl={pl} cf={cf} loans={loans} kpi={kpi} farm={farm} />

      <EngineGate response={pl} params={params} describePath={describePath}>
        {({ months }) => (
          <Card
            title="Operating Surplus by month"
            subtitle="Income minus operating costs, Jan–Dec. Hatched months after “Today” are forecast by the engine from last year’s pattern, this year’s trend and market prices."
            badge={<Badge>pl.months</Badge>}
          >
            <MonthlyChart data={surplusChartData(farm, months)} />
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
                <CashChart data={cashChartData(farm, r.months)} />
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

      {farm.profile.enterprise === "dairy" && <KpiCard response={kpi} params={params} describePath={describePath} />}

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
