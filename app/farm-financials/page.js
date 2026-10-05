import { Badge, Card, COLORS } from "@/components/ui";
import EngineGate, { providedFor } from "@/components/financials/EngineGate";
import MonthlyChart from "@/components/financials/MonthlyChart";
import CashChart from "@/components/financials/CashChart";
import Breakdown, { expenseRows, incomeRows } from "@/components/financials/Breakdown";
import { EventsCard, LoansCard, Stat, SupplierDebtCard } from "@/components/financials/PlatformCards";
import StatusTiles from "@/components/financials/StatusTiles";
import SourcesToggle from "@/components/SourcesToggle";
import { cfMonths, loanSchedule, plMonths } from "@/lib/financial-engine/client";
import { buildCfMonthsInput, buildPlMonthsInput, getFarm, isProjected } from "@/lib/financials/farm";
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

  const [pl, loans] = await Promise.all([plMonths(buildPlMonthsInput(farm)), loanSchedule({})]);
  // Projected cash needs projected milk revenue from pl.months, so cash waits for it.
  const cf =
    pl.status === "ok"
      ? await cfMonths(buildCfMonthsInput(farm, pl.result, providedFor("cf.months", params)))
      : { status: "error", error: { code: "needs_pl", message: "Cash flow needs the monthly P&L first." } };

  const asOf = monthLabel(farm.actual_through_month);
  const tag = (m) => ({ label: monthLabel(m.period.month), projected: isProjected(farm, m.period.month) });

  return (
    <div className="space-y-6 p-6">
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

      <EngineGate response={pl} params={params}>
        {({ months, ytd, currency }) => (
          <>
            <Card
              title="Income, operating costs & Operating Surplus"
              subtitle="Monthly, Jan–Dec. Hatched months after “Today” are projected from your budget and market prices."
              badge={<Badge>pl.months</Badge>}
            >
              <MonthlyChart
                data={months.map((m) => ({
                  ...tag(m),
                  income: m.revenue.total,
                  costs: m.costs.total,
                  surplus: m.profit.net,
                }))}
              />
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Income Breakdown YTD" subtitle={`Jan–${asOf}`} badge={<Badge>pl.months · ytd</Badge>}>
                <Breakdown rows={incomeRows(ytd.revenue)} total={ytd.revenue.total} currency={currency} />
              </Card>
              <Card title="Expense Breakdown YTD" subtitle={`Operating costs, Jan–${asOf}. Loan repayments excluded.`} badge={<Badge>pl.months · ytd</Badge>}>
                <Breakdown rows={expenseRows(ytd.costs.lines)} total={ytd.costs.total} color={COLORS.costs} currency={currency} />
              </Card>
            </div>
          </>
        )}
      </EngineGate>

      <Card title="Cash in the bank, month by month" subtitle="Month-end balance incl. loan repayments and machinery spend" badge={<Badge>cf.months</Badge>}>
        <EngineGate response={cf} params={params}>
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
              </>
            );
          }}
        </EngineGate>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <LoansCard response={loans} />
        <SupplierDebtCard data={farm.suppliers} />
        <EventsCard data={farm.events} />
      </div>
    </div>
  );
}
