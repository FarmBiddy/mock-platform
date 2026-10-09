import { engineAuthHeader, getFinancialEngineBaseUrl } from "./config";
import { ENGINE_MOCKS } from "./mocks";

/**
 * The ONLY Financial Engine client. Components never fetch the engine directly.
 * Knows the HTTP envelope; does no financial maths.
 *
 * @typedef {{ field: string, unit: string, path?: string }} MissingField
 * @typedef {{ code: string, message?: string, field?: string, details?: object }} EngineError
 *
 * @template T
 * @typedef {(
 *   | { status: "ok", function: string, result: T, mock?: true, meta?: { engine_version: string } }
 *   | { status: "needs_input", function: string, missing: MissingField[], provided: string[] }
 *   | { status: "error", function?: string, error: EngineError }
 * )} EngineResponse
 */

/**
 * Money split into lines + published total.
 * @typedef {{ lines: Record<string, number>, total: number }} LineSet
 *
 * Operating Statement (pl.monthly item / pl.months ytd).
 * @typedef {{
 *   currency: string,
 *   period: { kind: "month" | "ytd", year: number, month?: number, as_of_month?: number, months_included?: number[] },
 *   revenue: { milk: number, schemes: number, other: number, total: number },
 *   costs: LineSet,
 *   profit: { net: number, margin: number, margin_pct: number },
 *   finance: { loan_repayments: number },
 * }} PlStatement
 *
 * @typedef {{ currency: string, months: PlStatement[], ytd: PlStatement | null }} PlMonthsResult
 *
 * @typedef {{ inflows: LineSet, outflows: LineSet, net: number }} CashActivity
 * @typedef {{
 *   currency: string,
 *   period: { kind: "month", year: number, month: number },
 *   operating: CashActivity, investing: CashActivity, financing: CashActivity,
 *   cash_in: number, cash_out: number, net_cash_flow: number,
 *   opening_cash: number | null, closing_cash: number | null,
 * }} CfMonth
 *
 * @typedef {{
 *   currency: string, opening_cash: number, months: CfMonth[],
 *   cash_in: number, cash_out: number, net_cash_flow: number, closing_cash: number,
 * }} CfMonthsResult
 *
 * loan.schedule (multi-loan). Results are in input order; names/lenders stay on the platform.
 * @typedef {{ period: { kind: "month", year: number, month: number }, opening_balance: number, payment: number, interest: number, principal: number, closing_balance: number }} LoanMonth
 * @typedef {{
 *   currency: string,
 *   loans: {
 *     balance: number, annual_rate: number, remaining_months: number, monthly_payment: number,
 *     total_interest: number, total_payments: number, repaid_pct: number | null, months: LoanMonth[],
 *   }[],
 *   total_balance: number,
 *   total_monthly_payment: number,
 *   total_interest: number,
 *   months: { period: { kind: "month", year: number, month: number }, payment: number, interest: number, principal: number }[],
 * }} LoanScheduleResult
 *
 * kpi.summary (ADR-0028/0032/0033). Any ratio may be null (not computable) → show "—".
 * @typedef {{ revenue: number|null, costs: number|null, gross_margin: number|null, operating_surplus: number|null }} KpiBlock
 * @typedef {{
 *   currency: string, from: object, to: object, month_count: number, milking_cows: number,
 *   totals: { milk_litres: number, revenue: number, costs: number, operating_surplus: number, loan_repayments: number },
 *   per_litre_c: KpiBlock & { variable_costs: number|null, fixed_costs: number|null, cost_lines: Record<string, number|null> },
 *   per_cow: KpiBlock & { milk_litres: number|null },
 *   per_kg_ms: KpiBlock | null,
 *   per_hectare: (KpiBlock & { milk_litres: number|null }) | null,
 *   debt: { balance: number, per_cow: number|null, per_hectare: number|null } | null,
 *   dscr: number | null,
 * }} KpiSummaryResult
 */

/**
 * POST /v1/functions/<id>/run. Network/HTTP failures come back as status "error"
 * so callers handle exactly three cases.
 *
 * @param {string} id
 * @param {object} input
 * @returns {Promise<EngineResponse<any>>}
 */
export async function runFunction(id, input) {
  if (ENGINE_MOCKS[id]) {
    return { status: "ok", function: id, result: ENGINE_MOCKS[id], mock: true };
  }

  let response;
  try {
    response = await fetch(`${getFinancialEngineBaseUrl()}/v1/functions/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...engineAuthHeader() },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return {
      status: "error",
      function: id,
      error: { code: "engine_unreachable", message: "Financial Engine is unreachable. Is it running?" },
    };
  }

  const body = await response.json().catch(() => null);
  if (["ok", "needs_input", "error"].includes(body?.status)) return body;

  return {
    status: "error",
    function: id,
    error: { code: "bad_response", message: `Financial Engine HTTP ${response.status}` },
  };
}

/** @returns {Promise<EngineResponse<PlMonthsResult>>} */
export const plMonths = (input) => runFunction("pl.months", input);

/** @returns {Promise<EngineResponse<CfMonthsResult>>} */
export const cfMonths = (input) => runFunction("cf.months", input);

/** @returns {Promise<EngineResponse<LoanScheduleResult>>} */
export const loanSchedule = (input) => runFunction("loan.schedule", input);

/** @returns {Promise<EngineResponse<KpiSummaryResult>>} */
export const kpiSummary = (input) => runFunction("kpi.summary", input);

/** Seasonal run-rate forecast (ADR-0026): `months[].inputs` plug into pl.months. */
export const plForecast = (input) => runFunction("pl.forecast", input);

/** Seasonal run-rate forecast (ADR-0026): `months[].inputs` plug into cf.months. */
export const cfForecast = (input) => runFunction("cf.forecast", input);

/** Variance vs prior year / budget (ADR-0035): every money leaf is {actual, comparison, change, change_pct}. */
export const plCompare = (input) => runFunction("pl.compare", input);

/** Cash movements vs prior year (ADR-0035): totals and every cash line for the period, {actual, comparison, change, change_pct}. */
export const cfCompare = (input) => runFunction("cf.compare", input);

/** What-if scenarios and milk-price break-evens (ADR-0029/0031/0033); scenarios[0] is always "base". */
export const riskSensitivity = (input) => runFunction("risk.sensitivity", input);

/** Driver ranking (ADR-0044): one driver at a time down / up, sorted by swing of `rank_by`. */
export const riskTornado = (input) => runFunction("risk.tornado", input);

/** Partial budget for one change (ADR-0045): labelled annual gains / losses + optional capital charge. */
export const partialBudget = (input) => runFunction("decision.partial_budget", input);

/** Investment appraisal (ADR-0046): NPV, IRR, simple / discounted payback, year-by-year schedule. */
export const investmentAppraisal = (input) => runFunction("decision.investment", input);

/** Repayment and borrowing capacity after drawings and tax (ADR-0036). */
export const debtCapacity = (input) => runFunction("debt.capacity", input);

/**
 * Report bundles (ADR-0041): one farm file, three audiences. Each section is the output of the matching ID.
 * @param {"bank" | "advisor" | "accountant"} kind
 */
export const runReport = (kind, farmFile) => runFunction(`report.${kind}`, farmFile);

/** Multi-year annual plan (ADR-0042): assumptions per year, investments, debt and net worth by year. */
export const planProjection = (input) => runFunction("plan.projection", input);
