/**
 * Presentation labels for engine field / line keys.
 * Label mapping only — no financial maths.
 */

const REVENUE_LABELS = {
  milk: "Milk",
  schemes: "Schemes",
  other: "Other income",
  total: "Operating Income",
};

const COST_LABELS = {
  feed: "Feed",
  fertiliser: "Fertiliser",
  vet: "Vet",
  contractor: "Contractor",
  labour: "Labour",
  insurance: "Insurance",
  fuel: "Fuel",
  electricity: "Electricity",
  water: "Water",
  repairs_maintenance: "Repairs & maintenance",
  rent_lease: "Rent / lease",
  professional_fees: "Professional fees",
  levies: "Levies",
  other_operating_costs: "Other operating costs",
};

const INPUT_LABELS = {
  milking_cows: "Milking cows",
  litres_per_cow: "Litres per cow",
  milk_price: "Milk price",
  biss: "BISS",
  acres: "Acres (scheme)",
  other_grants: "Other grants",
  cattle_sales: "Cattle sales",
  land_leasing_income: "Land leasing income",
  other: "Other income",
  feed: "Feed",
  fertiliser: "Fertiliser",
  vet: "Vet",
  contractor: "Contractor",
  labour: "Labour",
  insurance: "Insurance",
  fuel: "Fuel",
  electricity: "Electricity",
  water: "Water",
  repairs_maintenance: "Repairs & maintenance",
  rent_lease: "Rent / lease",
  professional_fees: "Professional fees",
  levies: "Levies",
  other_operating_costs: "Other operating costs",
  loan_repayments: "Loan repayments",
  opening_cash: "Bank balance at start",
};

export function labelForInput(field) {
  return INPUT_LABELS[field] ?? field;
}

export function labelForRevenue(key) {
  return REVENUE_LABELS[key] ?? key;
}

export function labelForCost(key) {
  return COST_LABELS[key] ?? key;
}

/**
 * Shape engine result for display. Reads published fields only.
 * Does not recompute totals or margins.
 *
 * @param {object} result Engine result object from status === 'ok'
 */
export function mapEngineResultForDisplay(result) {
  if (!result) return null;

  const costLines = result.costs?.lines
    ? Object.entries(result.costs.lines).map(([key, amount]) => ({
        key,
        label: labelForCost(key),
        amount,
      }))
    : [];

  return {
    currency: result.currency ?? "EUR",
    period: result.period ?? "annual",
    operatingIncome: result.revenue?.total,
    milk: result.revenue?.milk,
    schemes: result.revenue?.schemes,
    otherRevenue: result.revenue?.other,
    operatingCosts: result.costs?.total,
    costLines,
    operatingSurplus: result.profit?.net,
    margin: result.profit?.margin,
    marginPct: result.profit?.margin_pct,
    loanRepayments: result.finance?.loan_repayments,
  };
}
