import joeBloggs from "@/data/farms/joe-bloggs.json";
import { getMilkPrice } from "@/lib/market";
import { cfForecast, cfMonths, kpiSummary, loanSchedule, plCompare, plForecast, plMonths } from "@/lib/financial-engine/client";

/**
 * Platform-owned farm data (one JSON per demo user) and the engine payloads
 * built from it. Builders only move numbers around — no financial maths.
 *
 * Farm JSON: `months` = this year's actuals (Jan..actual_through_month), `prior_year` = last year's
 * actuals (history for the engine forecast). Projected months come from pl.forecast / cf.forecast.
 */

const FARMS = { "joe-bloggs": joeBloggs };

export function getFarm(id = "joe-bloggs") {
  return FARMS[id];
}

/** Engine month is projected if it is after the last actual month. */
export function isProjected(farm, month) {
  return month > farm.actual_through_month;
}

/** loan.schedule input: numbers only, in the same order as `farm.loans` (names/lenders stay here). */
export function buildLoanScheduleInput(farm) {
  return {
    loans: farm.loans.map((l) => ({
      balance: l.balance,
      annual_rate: l.annual_rate,
      remaining_months: l.remaining_months,
      year: l.next_payment.year,
      month: l.next_payment.month,
      ...(l.original_principal == null ? {} : { original_principal: l.original_principal }),
    })),
  };
}

/** Combined debt service per month from loan.schedule (engine output), keyed by month. */
function debtByMonth(farm, loans) {
  return new Map(loans?.months.filter((m) => m.period.year === farm.year).map((m) => [m.period.month, m]) ?? []);
}

const actual = (farm) => farm.months.filter((m) => m.month <= farm.actual_through_month);
const plItem = (year, m) => ({ year, month: m.month, ...m.lines, ...m.pl });
const cfItem = (year, m) => ({ year, month: m.month, ...m.lines, ...m.cash });
/** Months still to forecast this year (after the last actual, through December). */
const ahead = (farm) => Array.from({ length: 12 - farm.actual_through_month }, (_, i) => farm.actual_through_month + 1 + i);
/** Forecast `inputs` plug into pl.months / cf.months once given their period back. */
const projected = (forecast) => forecast?.months.map((f) => ({ year: f.period.year, month: f.period.month, ...f.inputs })) ?? [];

/**
 * pl.forecast input: last year + this year's actuals as history; known drivers for the projected months
 * (market milk price from the platform adapter, loan repayments from the engine's loan schedule).
 */
export function buildPlForecastInput(farm, loans) {
  const debt = debtByMonth(farm, loans);
  return {
    history: [...farm.prior_year.map((m) => plItem(farm.year - 1, m)), ...actual(farm).map((m) => plItem(farm.year, m))],
    forecast: ahead(farm).map((month) => ({
      year: farm.year,
      month,
      milk_price: getMilkPrice(farm.year, month),
      ...(debt.get(month) ? { loan_repayments: debt.get(month).payment } : {}),
    })),
  };
}

/** pl.months input: actual months + the engine's projected inputs, and YTD through the last actual month. */
export function buildPlMonthsInput(farm, plForecastResult) {
  return {
    months: [...actual(farm).map((m) => plItem(farm.year, m)), ...projected(plForecastResult)],
    ytd: { year: farm.year, as_of_month: farm.actual_through_month },
  };
}

/**
 * kpi.summary input: the actual months of the P&L input (same items) + herd/land size and current debt.
 * @param {object} farm
 * @param {{ months: object[] }} plInput  the pl.months body that was sent
 * @param {import("@/lib/financial-engine/client").LoanScheduleResult | null} loans
 */
export function buildKpiInput(farm, plInput, loans) {
  return {
    months: plInput.months.filter((m) => m.month <= farm.actual_through_month),
    ...(farm.milking_cows == null ? {} : { milking_cows: farm.milking_cows }), // omitted → engine asks (needs_input)
    ...(farm.hectares == null ? {} : { hectares: farm.hectares }),
    ...(loans ? { debt_balance: loans.total_balance } : {}),
  };
}

/** pl.compare input: this year's actual months vs the same months last year. */
export function buildPlCompareInput(farm) {
  const months = new Set(actual(farm).map((m) => m.month));
  return {
    actual: actual(farm).map((m) => plItem(farm.year, m)),
    comparison: farm.prior_year.filter((m) => months.has(m.month)).map((m) => plItem(farm.year - 1, m)),
  };
}

/**
 * cf.forecast input. Known values for projected months: the milk cheque (paid the month after supply,
 * so the engine-published milk revenue of the month before, at the market price) and loan principal /
 * interest from the loan schedule. Everything else recurs from history (incl. household drawings).
 *
 * @param {object} farm
 * @param {import("@/lib/financial-engine/client").PlMonthsResult} pl
 * @param {import("@/lib/financial-engine/client").LoanScheduleResult} loans
 */
export function buildCfForecastInput(farm, pl, loans) {
  const milkByMonth = new Map(pl.months.map((s) => [s.period.month, s.revenue.milk]));
  const debt = debtByMonth(farm, loans);
  return {
    history: [...farm.prior_year.map((m) => cfItem(farm.year - 1, m)), ...actual(farm).map((m) => cfItem(farm.year, m))],
    forecast: ahead(farm).map((month) => {
      const d = debt.get(month);
      const milk = milkByMonth.get(month - 1);
      return {
        year: farm.year,
        month,
        ...(milk == null ? {} : { milk }),
        ...(d ? { loan_principal_repayments: d.principal, interest_paid: d.interest } : {}),
      };
    }),
  };
}

/** cf.months input: opening bank balance + actual cash months + the engine's projected cash inputs. */
export function buildCfMonthsInput(farm, cfForecastResult) {
  return {
    ...(farm.opening_cash == null ? {} : { opening_cash: farm.opening_cash }),
    months: [...actual(farm).map((m) => cfItem(farm.year, m)), ...projected(cfForecastResult)],
  };
}

/**
 * The engine chain for one farm (later calls need earlier results):
 * loan.schedule → pl.forecast → pl.months (+ kpi.summary, pl.compare) → cf.forecast → cf.months.
 * `prepare(fn, input)` may adjust each input before it is sent (e.g. farmer answers to needs_input).
 * Returns the engine responses plus the exact inputs sent, which Biddy's agents also receive.
 * If a forecast fails, the year shows actual months only and `plf` / `cff` carry the reason.
 */
export async function runFarm(farm, prepare = (_fn, input) => input) {
  const inputs = {};
  const send = (fn, call, input) => call((inputs[fn] = prepare(fn, input)));
  const result = (r) => (r?.status === "ok" ? r.result : null);
  const hasAhead = ahead(farm).length > 0;

  const loans = await send("loan.schedule", loanSchedule, buildLoanScheduleInput(farm));
  const plf = hasAhead ? await send("pl.forecast", plForecast, buildPlForecastInput(farm, result(loans))) : null;
  // P&L still runs without loans: repayments sit outside Operating Surplus, so surplus figures stay right.
  const pl = await send("pl.months", plMonths, buildPlMonthsInput(farm, result(plf)));
  const kpi = await send("kpi.summary", kpiSummary, buildKpiInput(farm, inputs["pl.months"], result(loans)));
  const plc = farm.prior_year?.length ? await send("pl.compare", plCompare, buildPlCompareInput(farm)) : null;

  let cff = null;
  let cf;
  if (pl.status !== "ok") {
    cf = { status: "error", error: { code: "needs_pl", message: "Cash flow needs the monthly P&L first." } };
  } else if (!result(loans)) {
    cf = { status: "error", error: { code: "needs_loans", message: "Cash flow needs the loan schedule first." } };
  } else {
    cff = hasAhead ? await send("cf.forecast", cfForecast, buildCfForecastInput(farm, pl.result, loans.result)) : null;
    cf = await send("cf.months", cfMonths, buildCfMonthsInput(farm, result(cff)));
  }

  return { inputs, loans, plf, pl, kpi, plc, cff, cf };
}

/** risk.sensitivity input from the inputs runFarm sent (same P&L and cash months as the page). */
export function buildRiskInput(inputs, scenarios = []) {
  return {
    pl_months: inputs["pl.months"].months,
    cf_months: inputs["cf.months"].months,
    opening_cash: inputs["cf.months"].opening_cash,
    ...(scenarios.length ? { scenarios } : {}),
  };
}
