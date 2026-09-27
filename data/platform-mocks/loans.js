/**
 * Platform-only mock loan cards.
 * NEVER sent to the Financial Engine.
 */
export const MOCK_LOANS = [
  {
    id: "loan-working-capital",
    name: "Working capital facility",
    lender: "Local Credit Union",
    balance: 48000,
    rateLabel: "Variable",
    nextPaymentLabel: "€1,000 / month",
  },
  {
    id: "loan-machinery",
    name: "Machinery loan",
    lender: "Agri Finance",
    balance: 22000,
    rateLabel: "Fixed 4.2%",
    nextPaymentLabel: "€650 / month",
  },
];
