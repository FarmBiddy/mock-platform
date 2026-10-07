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
  milk_litres: "Milk supplied",
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
  milk: "Milk",
  asset_disposal_proceeds: "Asset sales",
  machinery_equipment_payments: "Machinery & equipment",
  other_capital_payments: "Other capital spending",
  loan_proceeds: "New loans drawn",
  loan_principal_repayments: "Loan principal repaid",
  interest_paid: "Interest paid",
  household_drawings: "Household drawings",
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
