/**
 * Approved sample-farm input defaults (engine I2 reference).
 * These are INPUT drivers only — not calculated outputs.
 */
export const SAMPLE_ANNUAL_DAIRY_INPUTS = {
  milking_cows: 100,
  litres_per_cow: 5000,
  milk_price: 0.4,
  biss: 20000,
  acres: 5000,
  other_grants: 0,
  cattle_sales: 15000,
  land_leasing_income: 0,
  other: 0,
  feed: 80000,
  fertiliser: 15000,
  vet: 5000,
  contractor: 10000,
  labour: 40000,
  insurance: 4000,
  fuel: 6000,
  electricity: 3000,
  water: 0,
  repairs_maintenance: 0,
  rent_lease: 0,
  professional_fees: 0,
  levies: 0,
  other_operating_costs: 0,
  loan_repayments: 12000,
};

export const FORM_SECTIONS = [
  {
    id: "milk",
    title: "Milk production",
    fields: [
      { name: "milking_cows", step: "1", required: true },
      { name: "litres_per_cow", step: "1", required: true },
      { name: "milk_price", step: "0.01", required: true },
    ],
  },
  {
    id: "schemes",
    title: "Schemes & grants",
    fields: [
      { name: "biss", step: "1" },
      { name: "acres", step: "1" },
      { name: "other_grants", step: "1" },
    ],
  },
  {
    id: "other-income",
    title: "Other income",
    fields: [
      { name: "cattle_sales", step: "1" },
      { name: "land_leasing_income", step: "1" },
      { name: "other", step: "1" },
    ],
  },
  {
    id: "costs",
    title: "Operating costs",
    fields: [
      { name: "feed", step: "1" },
      { name: "fertiliser", step: "1" },
      { name: "vet", step: "1" },
      { name: "contractor", step: "1" },
      { name: "labour", step: "1" },
      { name: "insurance", step: "1" },
      { name: "fuel", step: "1" },
      { name: "electricity", step: "1" },
      { name: "water", step: "1" },
      { name: "repairs_maintenance", step: "1" },
      { name: "rent_lease", step: "1" },
      { name: "professional_fees", step: "1" },
      { name: "levies", step: "1" },
      { name: "other_operating_costs", step: "1" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    fields: [{ name: "loan_repayments", step: "1" }],
  },
];
