import Link from "next/link";
import { loadFarm } from "@/lib/farm-edits";
import { runReport } from "@/lib/financial-engine/client";
import { buildReportInput, runFarm } from "@/lib/financials/farm";
import { WHAT_IF_PRESETS } from "@/lib/financials/whatIf";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import PrintButton from "@/components/reports/PrintButton";
import {
  Capacity, Cash, CashFlow, Comparison, FixedAssets, Headline, Kpis, Loans, NetProfit, ProfitAndLoss, Section, Sensitivity, BalanceSheet, period,
} from "@/components/reports/Sections";

export const metadata = { title: "Reports · FarmBiddy" };

const REPORTS = {
  bank: { label: "Bank", blurb: "For your lender: profit, debt cover, loans, borrowing capacity, balance sheet and cash." },
  advisor: { label: "Advisor", blurb: "For your adviser: key figures, profit, this year vs last, and sensitivity." },
  accountant: { label: "Accountant", blurb: "For your accountant: P&L by line, net profit, fixed assets, balance sheet and cash flow." },
};
const ADVISOR_SCENARIOS = ["milk-5", "milk-10", "feed+10"];
const fmt = (v, d = 1) => v.toLocaleString("en-IE", { maximumFractionDigits: d });

/** One farm file → report.bank / report.advisor / report.accountant. Every figure is the engine's. */
export default async function ReportsPage({ searchParams }) {
  const { r } = await searchParams;
  const kind = REPORTS[r] ? r : "bank";
  const farm = await loadFarm();

  const { inputs, cf, cap } = await runFarm(farm);
  // Borrowing capacity over the full year (actual + forecast), the same debt.capacity run as Farm Financials,
  // rather than the bundle's actual-period figure, so the bank report and the page agree.
  const capacity = cap?.status === "ok" ? cap.result : null;
  const scenarios =
    kind === "advisor" ? WHAT_IF_PRESETS.filter((p) => ADVISOR_SCENARIOS.includes(p.id)).map((p) => ({ name: p.label, ...p.shock })) : [];
  const response =
    cf.status === "ok"
      ? await runReport(kind, buildReportInput(farm, inputs, scenarios))
      : { status: "error", error: { message: "The farm's cash flow couldn't be calculated." } };
  const rep = response.status === "ok" ? response.result : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {REPORTS[kind].label} report · {farm.profile.farm_name}
          </h1>
          <p className="text-sm text-stone-500">
            {farm.profile.name}, {farm.profile.county}
            {rep && ` · ${period(rep.period)} · prepared ${monthLabel(rep.as_of.month)} ${rep.as_of.year}`}
          </p>
        </div>
        <PrintButton />
      </div>

      <nav aria-label="Report type" className="flex gap-2 print:hidden">
        {Object.entries(REPORTS).map(([key, { label }]) => (
          <Link
            key={key}
            href={`/reports?r=${key}`}
            aria-current={key === kind ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ${key === kind ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-stone-600 print:hidden">{REPORTS[kind].blurb}</p>

      {!rep ? (
        <Section title="Couldn’t build the report">
          <p className="text-sm text-stone-600">
            {response.status === "needs_input"
              ? `Missing: ${response.missing.map((m) => m.field).join(", ")}. Add it on the Farm Financials page first.`
              : response.error?.message}
          </p>
        </Section>
      ) : kind === "bank" ? (
        <>
          <Headline
            items={[
              ["Net profit before tax", formatCurrency(rep.profit.net_profit_before_tax), `${fmt(rep.profit.net_margin_pct)}% net margin`],
              ["Debt service cover", rep.kpis.dscr == null ? "—" : `${fmt(rep.kpis.dscr, 2)}×`, "Operating Surplus / repayments"],
              ["Net worth", formatCurrency(rep.balance_sheet.net_worth), `${fmt(rep.balance_sheet.ratios.equity_pct)}% equity`],
              ["Borrowing headroom", capacity?.new_loan ? formatCurrency(capacity.new_loan.max_principal) : "—", "Largest new loan, full year"],
            ]}
          />
          <NetProfit p={rep.profit} />
          <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-2">
            <Loans loans={rep.loans} meta={farm.loans} />
            <Capacity c={capacity ?? rep.capacity} />
          </div>
          <BalanceSheet bs={rep.balance_sheet} />
          <Cash cash={rep.cash} />
        </>
      ) : kind === "advisor" ? (
        <>
          <Kpis k={rep.kpis} />
          <NetProfit p={rep.profit} />
          {rep.comparison ? <Comparison c={rep.comparison} /> : <Section title="This year vs last year">No prior-year figures.</Section>}
          <Sensitivity s={rep.sensitivity} />
        </>
      ) : (
        <>
          <ProfitAndLoss pl={rep.profit_and_loss} p={rep.period} />
          <NetProfit p={rep.net_profit} />
          <FixedAssets fa={rep.fixed_assets} meta={farm.assets} />
          <BalanceSheet bs={rep.balance_sheet} />
          <CashFlow cf={rep.cash_flow} p={rep.period} />
        </>
      )}

      <p className="text-xs text-stone-400">
        Figures calculated by the FarmBiddy Financial Engine from the farm’s records. Projections are estimates.
      </p>
    </div>
  );
}
