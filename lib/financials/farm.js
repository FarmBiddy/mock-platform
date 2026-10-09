import joeBloggs from "@/data/farms/joe-bloggs.json";
import patMurphy from "@/data/farms/pat-murphy.json";
import siobhanKelly from "@/data/farms/siobhan-kelly.json";
import tomWalsh from "@/data/farms/tom-walsh.json";
import { getMilkPrice } from "@/lib/market";
import { cfForecast, cfMonths, debtCapacity, kpiSummary, loanSchedule, plCompare, plForecast, plMonths } from "@/lib/financial-engine/client";

/**
 * Platform-owned farm data (one JSON per demo user) and the engine payloads
 * built from it. Builders only move numbers around — no financial maths.
 *
 * Farm JSON: `months` = this year's actuals (Jan..actual_through_month), `prior_year` = last year's
 * actuals (history for the engine forecast). Projected months come from pl.forecast / cf.forecast.
 */

/** Demo farms (all dairy: the engine is dairy-only). Joe is the demo owner; all four are the demo advisor's clients. */
export const FARMS = { "joe-bloggs": joeBloggs, "pat-murphy": patMurphy, "siobhan-kelly": siobhanKelly, "tom-walsh": tomWalsh };

export function getFarm(id = "joe-bloggs") {
  return Object.hasOwn(FARMS, id) ? FARMS[id] : undefined;
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
      ...(l.rate_type === "Variable" ? { variable: true } : {}), // reprices under rate shocks (ADR-0043)
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

/** Milk price for a projected month: the farmer's own figure if set, else the platform market adapter. */
export const forecastMilkPrice = (farm, month) => farm.market?.milk_price ?? getMilkPrice(farm.year, month);

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
      milk_price: forecastMilkPrice(farm, month),
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

/**
 * debt.capacity input: the year's P&L months (actual + forecast) and the household budget and
 * new-loan terms the platform holds (drawings / tax are platform data; min cover is lender policy).
 */
export function buildDebtCapacityInput(farm, plInput) {
  const h = farm.household ?? {};
  const t = farm.new_loan_terms ?? {};
  return {
    months: plInput.months,
    ...(t.annual_rate == null ? {} : { annual_rate: t.annual_rate }),
    ...(t.term_months == null ? {} : { term_months: t.term_months }),
    ...(t.min_cover == null ? {} : { min_cover: t.min_cover }),
    ...(h.drawings_per_year == null ? {} : { drawings: h.drawings_per_year }),
    ...(h.tax_per_year == null ? {} : { tax: h.tax_per_year }),
    ...(h.off_farm_income_per_year == null ? {} : { off_farm_income: h.off_farm_income_per_year }),
  };
}

/**
 * debt.capacity inputs on actual months only, for a prudent "could the farm take on a new loan?":
 * the last 12 actual months (end of last year + this year so far) and last calendar year. No forecast:
 * a loan is a long commitment, so it is sized on what actually happened. Periods without 12 months
 * of records are left out.
 * @returns {{ key: "last12" | "lastYear", input: object }[]}
 */
export function buildHistoricDebtCapacityInputs(farm) {
  const end = farm.actual_through_month;
  const prior = farm.prior_year ?? [];
  const last12 = [...prior.filter((m) => m.month > end).map((m) => plItem(farm.year - 1, m)), ...actual(farm).map((m) => plItem(farm.year, m))];
  const lastYear = prior.map((m) => plItem(farm.year - 1, m));
  return [
    { key: "last12", months: last12 },
    { key: "lastYear", months: lastYear },
  ]
    .filter((p) => p.months.length === 12)
    .map(({ key, months }) => ({ key, input: buildDebtCapacityInput(farm, { months }) }));
}

/** pl.compare input: this year's actual months vs the same months last year. */
export function buildPlCompareInput(farm) {
  const months = new Set(actual(farm).map((m) => m.month));
  return {
    actual: actual(farm).map((m) => plItem(farm.year, m)),
    comparison: farm.prior_year.filter((m) => months.has(m.month)).map((m) => plItem(farm.year - 1, m)),
  };
}

/** cf.compare input: this year's actual cash months vs the same months last year (money in / out so far, by line). */
export function buildCfCompareInput(farm) {
  const months = new Set(actual(farm).map((m) => m.month));
  return {
    actual: actual(farm).map((m) => cfItem(farm.year, m)),
    comparison: farm.prior_year.filter((m) => months.has(m.month)).map((m) => cfItem(farm.year - 1, m)),
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
 * loan.schedule → pl.forecast → pl.months (+ kpi.summary, pl.compare, debt.capacity) → cf.forecast → cf.months.
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
  const cap = await send("debt.capacity", debtCapacity, buildDebtCapacityInput(farm, inputs["pl.months"]));

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

  return { inputs, loans, plf, pl, kpi, plc, cap, cff, cf };
}

/**
 * risk.sensitivity input from the inputs runFarm sent (same P&L and cash months as the page).
 * Shocks start at the first projected month (ADR-0040): actual months stay as they happened.
 * The loans behind the months' loan lines go too, so `rate_shift_pp` can reprice the variable ones (ADR-0043).
 */
export function buildRiskInput(farm, inputs, scenarios = []) {
  const from = ahead(farm)[0];
  return {
    pl_months: inputs["pl.months"].months,
    cf_months: inputs["cf.months"].months,
    opening_cash: inputs["cf.months"].opening_cash,
    loans: inputs["loan.schedule"].loans,
    ...(from ? { shocks_from_year: farm.year, shocks_from_month: from } : {}),
    ...(scenarios.length ? { scenarios } : {}),
  };
}

/**
 * Farm file for report.bank / report.advisor / report.accountant (ADR-0041), built from the inputs
 * runFarm sent so reports and screens agree. Period = actual months; projections = forecast inputs.
 * Balances, valuations and the asset register are platform records at the report date.
 */
export function buildReportInput(farm, inputs, scenarios = []) {
  const isActual = (m) => m.year === farm.year && m.month <= farm.actual_through_month;
  const bs = farm.balance_sheet ?? {};
  const paid = farm.household_paid_to_date ?? {};
  const t = farm.new_loan_terms;
  const months = new Set(actual(farm).map((m) => m.month));
  return {
    pl_months: inputs["pl.months"].months.filter(isActual),
    cf_months: inputs["cf.months"].months.filter(isActual),
    projected_pl_months: inputs["pl.months"].months.filter((m) => !isActual(m)),
    projected_cf_months: inputs["cf.months"].months.filter((m) => !isActual(m)),
    opening_cash: inputs["cf.months"].opening_cash,
    ...(farm.milking_cows == null ? {} : { milking_cows: farm.milking_cows }),
    ...(farm.hectares == null ? {} : { hectares: farm.hectares }),
    prior_pl_months: (farm.prior_year ?? []).filter((m) => months.has(m.month)).map((m) => plItem(farm.year - 1, m)),
    loans: inputs["loan.schedule"].loans,
    assets: (farm.assets ?? []).map(({ id, name, ...asset }) => asset),
    debtors: bs.debtors ?? 0,
    stock: bs.stock ?? 0,
    livestock: bs.livestock ?? 0,
    land: bs.land ?? 0,
    creditors: farm.suppliers?.total_outstanding ?? 0,
    other_long_term_liabilities: bs.other_long_term_liabilities ?? 0,
    ...(bs.livestock_opening_value == null ? {} : { livestock_opening_value: bs.livestock_opening_value }),
    ...(bs.stock_opening_value == null ? {} : { stock_opening_value: bs.stock_opening_value }),
    drawings: paid.drawings ?? 0,
    tax: paid.tax ?? 0,
    off_farm_income: paid.off_farm_income ?? 0,
    ...(t ? { new_loan: { annual_rate: t.annual_rate, term_months: t.term_months, min_cover: t.min_cover } } : {}),
    ...(scenarios.length ? { scenarios } : {}),
  };
}

/**
 * plan.projection input (ADR-0042). Base = the last 12 actual months (end of last year + this year);
 * opening cash = the engine's month-end balance at the end of the base. Assumptions come from a preset
 * the advisor holds, with the farmer's overrides; investments from the platform's list.
 *
 * @param {object} farm
 * @param {object} inputs   what runFarm sent
 * @param {import("@/lib/financial-engine/client").CfMonthsResult} cash  cf.months result
 * @param {{ assumptions: object, investments: object[], years?: number }} plan
 */
export function buildPlanInput(farm, inputs, cash, { assumptions, investments, years = 5 }) {
  const end = farm.actual_through_month;
  const base = [
    ...farm.prior_year.filter((m) => m.month > end).map((m) => plItem(farm.year - 1, m)),
    ...actual(farm).map((m) => plItem(farm.year, m)),
  ];
  const bs = farm.balance_sheet ?? {};
  return {
    base_pl_months: base,
    opening_cash: cash.months.find((m) => m.period.year === farm.year && m.period.month === end)?.closing_cash,
    ...(farm.milking_cows == null ? {} : { milking_cows: farm.milking_cows }),
    years,
    assumptions,
    loans: inputs["loan.schedule"].loans,
    assets: (farm.assets ?? []).map(({ id, name, ...asset }) => asset),
    ...(bs.land == null ? {} : { land: bs.land }),
    ...(bs.livestock == null ? {} : { livestock: bs.livestock }),
    ...(farm.new_loan_terms?.min_cover == null ? {} : { min_cover: farm.new_loan_terms.min_cover }),
    ...(investments.length ? { investments } : {}),
  };
}
