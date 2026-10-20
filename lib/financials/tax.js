import { assetsSchedule, plNet, taxCapitalAllowances, taxEstimate, taxStockRelief, vatFlatRate } from "@/lib/financial-engine/client";

/**
 * The farmer's tax for this calendar year (Ireland, engine ADR-0053; engine branch ie-tax), chained as the engine's
 * integration guide says: vat.flat_rate → pl.net → tax.capital_allowances → tax.stock_relief → tax.estimate.
 * The year is this year's 12 P&L months as runFarm sent them (actual + forecast). Needs `farm.tax` (the tax profile
 * from Farm data). Returns every step's response so the page can show how the figure was reached.
 *
 * ponytail: valuations at the year end are the latest the farm holds (balance sheet at the last actual month);
 * a year-end valuation from the farmer or accountant is better.
 */
export async function runTax(farm, inputs, loans) {
  const t = farm.tax;
  const months = inputs["pl.months"]?.months ?? [];
  if (taxQuestionsLeft(t).length || months.length !== 12) return null;
  const year = farm.year;
  const bs = farm.balance_sheet ?? {};
  const values = {
    ...(bs.livestock_opening_value == null ? {} : { livestock_opening_value: bs.livestock_opening_value }),
    ...(bs.livestock == null ? {} : { livestock_closing_value: bs.livestock }),
    ...(bs.stock_opening_value == null ? {} : { stock_opening_value: bs.stock_opening_value }),
    ...(bs.stock == null ? {} : { stock_closing_value: bs.stock }),
  };
  const assets = (farm.assets ?? []).map(({ id, name, ...asset }) => asset);
  // For capital allowances only: each asset's grant and allowance type, from last year's accounts when imported
  const taxAssets = (farm.assets ?? []).map(({ id, name, ...asset }) => ({
    ...asset,
    ...(t.grant?.[id] ? { grant: t.grant[id] } : {}),
    ...(t.allowance?.[id] ? { tax_allowance: t.allowance[id] } : {}),
  }));
  const ok = (r) => (r?.status === "ok" ? r.result : null);

  const vatRegistered = t.vat === "registered";
  const vat = await vatFlatRate({ months, vat_registered: vatRegistered });
  const schedule = assets.length ? await assetsSchedule({ assets, from_year: year, from_month: 1, to_year: year, to_month: 12 }) : null;
  const depreciation = ok(schedule)?.total.depreciation ?? 0;
  // ponytail: pl.net takes the year's interest, not the loans, so the 12 months of loan.schedule interest are added
  // up here; drop this sum if pl.net accepts loans.
  const interest = (loans?.months ?? []).filter((m) => m.period.year === year).reduce((s, m) => s + m.interest, 0);
  const net = await plNet({ months, depreciation, interest: Math.round(interest * 100) / 100, ...values });
  if (!ok(net)) return { net, vat };

  const addition = vatRegistered ? 0 : (ok(vat)?.total.addition ?? 0);
  // No assets: tax.capital_allowances needs one, so the guide's stand-in (pl.net profit) is the trading profit.
  const allowances = assets.length
    ? await taxCapitalAllowances({
        tax_year: year,
        period_end_month: 12,
        assets: taxAssets,
        accounting_profit: net.result.net_profit_before_tax,
        depreciation,
        ...(addition ? { flat_rate_addition: addition } : {}),
      })
    : null;
  const trading = ok(allowances)?.profit_bridge.taxable_profit ?? net.result.net_profit_before_tax;

  const relief = await taxStockRelief({
    business_type: t.business_type,
    period_end_year: year,
    period_end_month: 12,
    trading_profit: trading,
    ...values,
    ...(t.young_trained_farmer_first_year ? { young_trained_farmer_first_year: t.young_trained_farmer_first_year } : {}),
  });
  if (!ok(relief)) return { net, vat, allowances, relief };

  const estimate = await taxEstimate({
    business_type: t.business_type,
    tax_year: year,
    taxable_profit: relief.result.profit_after_relief,
    stock_relief: relief.result.relief,
    stock_relief_regime: relief.result.regime,
    // a company pays corporation tax: the household fields are for individuals only. Only what the farmer
    // answered is sent (taxQuestionsLeft makes sure the ones that matter are answered).
    ...(t.business_type === "company"
      ? {}
      : {
          marital_status: t.marital_status,
          ...(t.marital_status === "married" ? { spouse_paye_income: t.spouse_paye_income } : {}),
          ...(farm.household?.off_farm_income_per_year == null ? {} : { other_income: farm.household.off_farm_income_per_year }),
        }),
  });
  return { net, vat, allowances, relief, estimate, assetsUsed: assets.length > 0 };
}

/**
 * The tax questions the farmer still has to answer before an estimate means anything (no defaults are assumed):
 * how the farm is set up and VAT always; for a person, married or not; if married, the spouse's wages (0 counts).
 */
export function taxQuestionsLeft(t = {}) {
  const left = [];
  if (!t.business_type) left.push("how the farm is set up");
  if (!t.vat) left.push("VAT");
  if (t.business_type !== "company") {
    if (!t.marital_status) left.push("married or not");
    else if (t.marital_status === "married" && t.spouse_paye_income == null) left.push("your spouse’s wages");
  }
  return left;
}

/** The household tax a lender should see: the accountant's figure when given, else the engine's estimate. */
export const householdTax = (farm, tax) =>
  farm.household?.tax_per_year ?? (tax?.estimate?.status === "ok" ? tax.estimate.result.total_tax : null);
