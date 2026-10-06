import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { Stat } from "@/components/financials/PlatformCards";
import PlanCharts from "@/components/plan/PlanCharts";
import { planProjection } from "@/lib/financial-engine/client";
import { loadFarm } from "@/lib/farm-edits";
import ProLock from "@/components/ProLock";
import { getViewer } from "@/lib/session";
import { buildPlanInput, runFarm } from "@/lib/financials/farm";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

export const metadata = { title: "Plan · FarmBiddy" };

const YEARS = 5;
const one = (v) => (Array.isArray(v) ? v[0] : v);
/** A number from the URL within [min, max], else null (URL input is untrusted). */
const param = (v, min, max) => {
  const n = Number(one(v));
  return one(v) != null && one(v) !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const fmt = (v, d = 1) => (v == null ? "—" : v.toLocaleString("en-IE", { maximumFractionDigits: d }));
const ym = (p) => `${monthLabel(p.month)} ${String(p.year).slice(2)}`;

/**
 * Five-year plan from plan.projection. Presets are advisor data; the farmer can change the milk price,
 * cost inflation and the investment. Annual figures hide seasonal dips, so link the 12-month forecast.
 */
export default async function PlanPage({ searchParams }) {
  const sp = await searchParams;
  const farm = await loadFarm();
  const { pro, role } = await getViewer();
  const presets = farm.plan_presets ?? {};
  const presetKeys = Object.keys(presets).filter((k) => !k.startsWith("_"));
  const presetKey = presetKeys.includes(one(sp.s)) ? one(sp.s) : "base";
  const preset = presets[presetKey];
  const price = param(sp.price, 0.2, 1);
  const inflation = param(sp.infl, -5, 15);
  const invIds = [].concat(sp.inv ?? []);
  const investments = (farm.plan_investments ?? []).filter((i) => invIds.includes(i.id));

  const assumptions = {
    ...preset.assumptions,
    ...(price == null ? {} : { milk_price: [price] }),
    ...(inflation == null ? {} : { cost_inflation_pct: Array(YEARS).fill(inflation) }),
  };

  const { inputs, cf } = await runFarm(farm);
  const response =
    cf.status === "ok"
      ? await planProjection(
          buildPlanInput(farm, inputs, cf.result, {
            assumptions,
            years: YEARS,
            investments: investments.map(({ id, name, note, ...inv }) => inv),
          }),
        )
      : { status: "error", error: { message: "This year's cash flow couldn't be calculated, so there's no starting balance." } };
  const plan = response.status === "ok" ? response.result : null;
  const last = plan?.years.at(-1);
  const lowest = (pick) => plan?.years.reduce((a, b) => (pick(b) != null && (pick(a) == null || pick(b) < pick(a)) ? b : a));
  const lowDscr = lowest((y) => y.debt.dscr);
  const lowCash = lowest((y) => y.cash.closing);
  // Same view for the advisor: the plan URL with this scenario, and engine figures as a one-line summary.
  const query = new URLSearchParams([["s", presetKey], ...(price == null ? [] : [["price", price]]), ...(inflation == null ? [] : [["infl", inflation]]), ...investments.map((i) => ["inv", i.id])]);
  const share =
    plan &&
    new URLSearchParams({
      title: `Five-year plan: ${preset.label}${investments.length ? ` + ${investments.map((i) => i.name).join(", ")}` : ""}`,
      summary: `Lowest year-end cash ${formatCurrency(lowCash.cash.closing)} (year ${lowCash.year}) · weakest loan cover ${fmt(lowDscr.debt.dscr, 2)}× · net worth in year ${YEARS} ${formatCurrency(last.balance_sheet.net_worth)}`,
      href: `/plan?${query}`,
    });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Five-year plan</h1>
        <p className="text-sm text-stone-500">
          What the next {YEARS} years could look like, starting from your last 12 months
          {plan && ` (${ym(plan.base.period.from)} – ${ym(plan.base.period.to)}: ${fmt(plan.base.milk_litres, 0)} L at ${fmt(plan.base.milk_price_c)}c/L)`}.
        </p>
      </div>

      <ProLock pro={pro} title="Plan the next five years" value="See where cash, debt cover and net worth go under cautious, base or optimistic prices — and what a new parlour would do.">
        <div className="space-y-6">
          <form className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 lg:grid-cols-[2fr_1fr_1fr]">
            <fieldset>
              <legend className="text-sm font-medium">Scenario</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {presetKeys.map((k) => (
                  <label key={k} className={`cursor-pointer rounded-xl p-3 text-sm ring-1 ${k === presetKey ? "bg-emerald-50 ring-emerald-600" : "ring-stone-200 hover:bg-stone-50"}`}>
                    <input type="radio" name="s" value={k} defaultChecked={k === presetKey} className="mr-2 accent-emerald-700" />
                    <span className="font-medium">{presets[k].label}</span>
                    <span className="mt-1 block text-xs text-stone-500">{presets[k].note}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-3 text-sm">
              <label className="block">
                Milk price, all years <span className="text-xs text-stone-400">€/litre, blank = scenario</span>
                <input name="price" type="number" step="0.005" min="0.2" max="1" defaultValue={price ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block">
                Cost inflation <span className="text-xs text-stone-400">% a year, blank = scenario</span>
                <input name="infl" type="number" step="0.5" min="-5" max="15" defaultValue={inflation ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
            </div>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Investments</p>
              {(farm.plan_investments ?? []).map((i) => (
                <label key={i.id} className="flex gap-2">
                  <input type="checkbox" name="inv" value={i.id} defaultChecked={invIds.includes(i.id)} className="mt-1 accent-emerald-700" />
                  <span>
                    {i.name}
                    <span className="block text-xs text-stone-500">{i.note}</span>
                  </span>
                </label>
              ))}
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900">Update plan</button>
            </div>
          </form>

          {!plan ? (
            <Card title="Couldn’t build the plan">
              <p className="text-sm text-stone-600">
                {response.status === "needs_input" ? `Missing: ${response.missing.map((m) => m.field).join(", ")}.` : response.error?.message}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label={`Net worth in year ${YEARS}`} value={formatCurrency(last.balance_sheet.net_worth)} hint={`After year 1: ${formatCurrency(plan.years[0].balance_sheet.net_worth)}`} />
                <Stat label={`Cash at end of year ${YEARS}`} value={formatCurrency(last.cash.closing)} danger={last.cash.closing < 0} />
                <Stat label="Lowest year-end cash" value={formatCurrency(lowCash.cash.closing)} danger={lowCash.cash.closing < 0} hint={`Year ${lowCash.year}`} />
                <Stat
                  label="Weakest loan cover"
                  value={lowDscr.debt.dscr == null ? "—" : `${fmt(lowDscr.debt.dscr, 2)}×`}
                  danger={lowDscr.flags.below_min_cover}
                  hint={`Year ${lowDscr.year}${farm.new_loan_terms?.min_cover ? ` · lender minimum ${fmt(farm.new_loan_terms.min_cover, 2)}×` : ""}`}
                />
              </div>

              {role === "owner" && (
                <Link href={`/share?${share}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-5 py-3 text-sm text-sky-900 ring-1 ring-sky-200 hover:bg-sky-100">
                  <span>Big decision? Get a second opinion before you commit.</span>
                  <span className="shrink-0 font-medium">Share with my advisor →</span>
                </Link>
              )}

              <Card title="Cash and net worth" subtitle="At the end of each plan year" badge={<Badge>plan.projection</Badge>}>
                <PlanCharts
                  years={plan.years.map((y) => ({
                    label: `Y${y.year}`,
                    period: `Year ${y.year}: ${ym(y.period.from)}–${ym(y.period.to)}`,
                    cash: y.cash.closing,
                    netWorth: y.balance_sheet.net_worth,
                  }))}
                />
              </Card>

              <Card title="Year by year" subtitle="Each year runs from the month after your last actual month." badge={<Badge>plan.projection</Badge>}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-sm tabular-nums">
                    <thead className="text-left text-xs text-stone-500">
                      <tr>
                        <th className="py-1 font-medium" />
                        {plan.years.map((y) => (
                          <th key={y.year} className="py-1 text-right font-medium">
                            Year {y.year}
                            <span className="block font-normal">
                              {ym(y.period.from)}–{ym(y.period.to)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {[
                        ["Milk price", (y) => `${fmt(y.kpis.milk_price_c)}c/L`, "assumption"],
                        ["Cost inflation", (y) => `${fmt(y.assumptions_used.cost_inflation_pct)}%`, "assumption"],
                        ["Cows", (y) => fmt(y.kpis.milking_cows, 0), "assumption"],
                        ["Milk sold", (y) => `${fmt(y.pl.milk_litres / 1000, 0)}k L`],
                        ["Income", (y) => formatCurrency(y.pl.revenue.total)],
                        ["Operating costs", (y) => formatCurrency(y.pl.costs.total)],
                        ["Operating Surplus", (y) => formatCurrency(y.pl.operating_surplus), "strong"],
                        ["Net profit before tax", (y) => formatCurrency(y.pl.net_profit_before_tax)],
                        ["Cost of production", (y) => `${fmt(y.kpis.costs_per_litre_c)}c/L`],
                        ["Drawings + tax", (y) => `${formatCurrency(y.cash.drawings)} + ${formatCurrency(y.cash.tax)}`],
                        ["Investment spend", (y) => (y.cash.capex ? formatCurrency(y.cash.capex) : "—")],
                        ["Cash at year end", (y) => formatCurrency(y.cash.closing), "strong", (y) => y.flags.negative_cash],
                        ["Debt at year end", (y) => formatCurrency(y.debt.closing_balance)],
                        ["Loan cover (DSCR)", (y) => (y.debt.dscr == null ? "—" : `${fmt(y.debt.dscr, 2)}×`), null, (y) => y.flags.below_min_cover],
                        ["Net worth", (y) => formatCurrency(y.balance_sheet.net_worth), "strong"],
                      ].map(([label, cell, kind, bad]) => (
                        <tr key={label} className={kind === "strong" ? "font-semibold" : kind === "assumption" ? "text-stone-500" : "text-stone-700"}>
                          <td className="py-1.5">{label}</td>
                          {plan.years.map((y) => (
                            <td key={y.year} className={`py-1.5 text-right ${bad?.(y) ? "text-red-700" : ""}`}>
                              {bad?.(y) && <span aria-hidden>⚠ </span>}
                              {cell(y)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-stone-500">
                  Grey rows are the assumptions used. Year-end figures hide seasonal dips: the spring overdraft can still happen inside a year
                  — see the{" "}
                  <Link href="/farm-financials" className="underline">
                    12-month cash forecast
                  </Link>
                  .
                </p>
              </Card>
            </>
          )}
        </div>
      </ProLock>
    </div>
  );
}
