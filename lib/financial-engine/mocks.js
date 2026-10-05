/**
 * Mock results for engine functions that are not live yet ("Coming soon").
 * Same shape the engine will return; delete an entry when its ID ships.
 */
export const ENGINE_MOCKS = {
  /** @type {import("./client").LoanScheduleResult} */
  "loan.schedule": {
    currency: "EUR",
    loans: [
      {
        id: "loan-working-capital",
        name: "Working capital facility",
        lender: "Local Credit Union",
        rate_pct: 3.75,
        balance: 48000,
        monthly_payment: 1000,
        end: { year: 2030, month: 12 },
        next_payment: { year: 2026, month: 10, principal: 850, interest: 150, total: 1000 },
      },
      {
        id: "loan-machinery",
        name: "Machinery loan",
        lender: "Agri Finance",
        rate_pct: 4.2,
        balance: 22000,
        monthly_payment: 650,
        end: { year: 2029, month: 6 },
        next_payment: { year: 2026, month: 10, principal: 570, interest: 80, total: 650 },
      },
    ],
    total_balance: 70000,
    total_monthly_payment: 1650,
  },
};
