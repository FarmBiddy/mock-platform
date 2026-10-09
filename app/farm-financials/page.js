import { loadFarm } from "@/lib/farm-edits";
import { Badge, Card } from "@/components/ui";
import EngineGate, { withProvided } from "@/components/financials/EngineGate";
import CashflowChart from "@/components/financials/CashflowChart";
import MoneyTiles from "@/components/financials/MoneyTiles";
import MoneyBreakdown from "@/components/financials/MoneyBreakdown";
import CheckFiguresNudge from "@/components/financials/CheckFiguresNudge";
import { LoansCard } from "@/components/financials/PlatformCards";
import KpiCard from "@/components/financials/KpiCard";
import WhatIfCard from "@/components/financials/WhatIfCard";
import BorrowCard from "@/components/financials/BorrowCard";
import SourcesToggle from "@/components/SourcesToggle";
import ProLock from "@/components/ProLock";
import { getViewer } from "@/lib/session";
import { readStressTests } from "@/lib/stress";
import { buildCfCompareInput, buildHistoricDebtCapacityInputs, buildRiskInput, runFarm } from "@/lib/financials/farm";
import { cfCompare, debtCapacity, riskSensitivity, riskTornado } from "@/lib/financial-engine/client";
import TornadoCard from "@/components/financials/TornadoCard";
import { cashflowChartData } from "@/lib/financials/views";
import { getMilkBenchmarks } from "@/lib/benchmarks";
import { monthLabel } from "@/lib/format/date";

export const metadata = { title: "Farm Financials · FarmBiddy" };

/** The What-if is hidden for the first demo (new users found it confusing); the code stays, flip to bring it back. */
const SHOW_WHAT_IF = false;

/**
 * Farm Financials, for people new to farm finance: money in, money out, money made, in plain words.
 * Platform data → Financial Engine → display. Every money figure on this page is engine-published.
 */
export default async function FarmFinancialsPage({ searchParams }) {
  const params = await searchParams;
  const farm = await loadFarm();
  const { pro, role } = await getViewer();

  const { inputs, loans, plf, kpi, cap, cff, cf } = await runFarm(farm, (fn, input) => withProvided(fn, params, input));
  // Money in / out so far and where it came from / went: this year's actual months vs the same months last year.
  const cfc = farm.prior_year?.length ? await cfCompare(buildCfCompareInput(farm)) : null;

  const asOf = monthLabel(farm.actual_through_month);
  // Say which month / loan a nested needs_input path points at, from the request that was sent.
  const describePath = (path, fn) => {
    const [, list, i] = path.match(/^(\w+)\[(\d+)\]/) ?? [];
    if (list === "loans") return farm.loans[i]?.name;
    const item = inputs[fn]?.[list]?.[i];
    return item?.month ? `${monthLabel(item.month)}${item.year !== farm.year ? ` ${item.year}` : ""}` : null;
  };
  const forecastIssue = [plf, cff].find((r) => r && r.status !== "ok");
  // New loan: sized on what actually happened (last 12 months and last year), never the forecast; the
  // lower of the two is the answer, the other is shown for context. Without a year of records: the year incl. forecast.
  const historic = await Promise.all(buildHistoricDebtCapacityInputs(farm).map(async ({ key, input }) => ({ key, response: await debtCapacity(input) })));
  const sized = historic.filter((h) => h.response.status === "ok");
  const prudent = sized.reduce((a, b) => (!a || b.response.result.new_loan.max_principal < a.response.result.new_loan.max_principal ? b : a), null);
  const otherPeriod = sized.find((h) => h !== prudent)?.response.result ?? null;
  // Latest co-op milk statement (platform record, shown as recorded) for the Milk quality tiles.
  const lastQuality = farm.months.find((m) => m.month === farm.actual_through_month)?.quality;
  const milkStatement = lastQuality
    ? { label: new Date(Date.UTC(farm.year, farm.actual_through_month - 1)).toLocaleString("en-IE", { month: "long", timeZone: "UTC" }), values: lastQuality }
    : null;
  const risk = SHOW_WHAT_IF && cf.status === "ok" ? await riskSensitivity(buildRiskInput(farm, inputs)) : null;
  // Advisor tool: which drivers move this client most.
  const rank = params.rank === "operating_surplus" ? "operating_surplus" : "closing_cash";
  const tornado = role === "advisor" && cf.status === "ok" ? await riskTornado({ ...buildRiskInput(farm, inputs), rank_by: rank }) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farm Financials</h1>
          <p className="text-sm text-stone-500">
            {farm.profile.farm_name}’s money in {farm.year}: what came in, what went out and what’s left. Up to the end of {asOf} is what happened; after
            that is our forecast.
          </p>
        </div>
        <SourcesToggle />
      </div>

      {forecastIssue && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Showing what happened so far only — the forecast couldn’t run ({forecastIssue.error?.message ?? "missing figures"}).
        </p>
      )}

      <MoneyTiles cfc={cfc} farm={farm} />

      <CheckFiguresNudge cfc={cfc} cf={cf} owner={role === "owner"} />

      <Card
        title="Cashflow"
        subtitle={`Money in, money out and money made, month by month. Paler bars after “Today” are our forecast for the rest of ${farm.year}.`}
        badge={<Badge>cf.months</Badge>}
      >
        <EngineGate response={cf} params={params} describePath={describePath}>
          {(r) => <CashflowChart data={cashflowChartData(farm, r.months)} />}
        </EngineGate>
      </Card>

      <MoneyBreakdown cfc={cfc} farm={farm} />

      {farm.profile.enterprise === "dairy" && <KpiCard response={kpi} params={params} describePath={describePath} milkBenchmarks={await getMilkBenchmarks(farm)} milkStatement={milkStatement} />}

      {risk && (
        <WhatIfCard
          initial={risk}
          year={farm.year}
          pro={pro}
          stressTests={await readStressTests()}
          stressBy={role === "owner" ? "your advisor" : null}
          priceSource={farm.market?.milk_price != null ? (role === "owner" ? "set by your advisor" : "set in Farm Data") : "market price feed"}
        />
      )}

      {tornado && <TornadoCard response={tornado} rank={rank} />}

      {/* Loans and what more could be borrowed, side by side. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <LoansCard response={loans} loans={farm.loans} params={params} describePath={describePath} />
        <ProLock pro={pro} title="Could the farm take on a new loan?" value="See how much the farm could borrow and what it would cost a month, before you talk to a bank.">
          <BorrowCard response={prudent?.response ?? cap} actualOnly={Boolean(prudent)} other={otherPeriod} params={params} describePath={describePath} />
        </ProLock>
      </div>
    </div>
  );
}
