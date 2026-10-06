import joeBloggs from "@/data/farms/joe-bloggs.json";
import { getMilkPrice } from "@/lib/market";
import { cfMonths, kpiSummary, loanSchedule, plMonths } from "@/lib/financial-engine/client";

/**
 * Platform-owned farm data (one JSON per demo user) and the engine payloads
 * built from it. Builders only move numbers around — no financial maths.
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

/**
 * pl.months input: every month (actual + budget) and YTD through the last actual month.
 * Projected months take loan repayments from the engine's loan schedule.
 *
 * @param {object} farm
 * @param {import("@/lib/financial-engine/client").LoanScheduleResult | null} loans
 */
export function buildPlMonthsInput(farm, loans) {
  const debt = debtByMonth(farm, loans);
  return {
    months: farm.months.map((m) => {
      const payment = m.pl.loan_repayments ?? debt.get(m.month)?.payment;
      return {
        year: farm.year,
        month: m.month,
        ...m.lines,
        ...m.pl,
        milk_price: m.pl.milk_price ?? getMilkPrice(farm.year, m.month),
        ...(payment == null ? {} : { loan_repayments: payment }),
      };
    }),
    ytd: { year: farm.year, as_of_month: farm.actual_through_month },
  };
}

/**
 * cf.months input. Projected milk cheques are paid the month after supply, so a
 * projected month's `milk` is the engine-published milk revenue of the month before.
 * Projected principal/interest come from the engine's loan schedule.
 *
 * @param {object} farm
 * @param {import("@/lib/financial-engine/client").PlMonthsResult} pl
 * @param {import("@/lib/financial-engine/client").LoanScheduleResult} loans
 */
export function buildCfMonthsInput(farm, pl, loans) {
  const milkByMonth = new Map(pl.months.map((s) => [s.period.month, s.revenue.milk]));
  const debt = debtByMonth(farm, loans);
  return {
    ...(farm.opening_cash == null ? {} : { opening_cash: farm.opening_cash }),
    months: farm.months.map((m) => {
      const milk = m.cash.milk ?? milkByMonth.get(m.month - 1);
      const d = debt.get(m.month);
      return {
        year: farm.year,
        month: m.month,
        ...m.lines,
        ...(d ? { loan_principal_repayments: d.principal, interest_paid: d.interest } : {}),
        ...m.cash,
        ...(milk == null ? {} : { milk }),
      };
    }),
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
 * The engine chain for one farm: loan.schedule → pl.months (+ kpi.summary) → cf.months (later calls need earlier results).
 * `prepare(fn, input)` may adjust each input before it is sent (e.g. farmer answers to needs_input).
 * Returns the engine responses plus the exact inputs sent, which Biddy's agents also receive.
 */
export async function runFarm(farm, prepare = (_fn, input) => input) {
  const inputs = {};
  const send = (fn, call, input) => call((inputs[fn] = prepare(fn, input)));

  const loans = await send("loan.schedule", loanSchedule, buildLoanScheduleInput(farm));
  const loanResult = loans.status === "ok" ? loans.result : null;
  // P&L still runs without loans: repayments sit outside Operating Surplus, so surplus figures stay right.
  const pl = await send("pl.months", plMonths, buildPlMonthsInput(farm, loanResult));
  const kpi = await send("kpi.summary", kpiSummary, buildKpiInput(farm, inputs["pl.months"], loanResult));
  const cf =
    pl.status !== "ok"
      ? { status: "error", error: { code: "needs_pl", message: "Cash flow needs the monthly P&L first." } }
      : !loanResult
        ? { status: "error", error: { code: "needs_loans", message: "Cash flow needs the loan schedule first." } }
        : await send("cf.months", cfMonths, buildCfMonthsInput(farm, pl.result, loanResult));

  return { inputs, loans, pl, kpi, cf };
}
