/** Advisor-only entry, shown first when viewing as the advisor. */
const PORTFOLIO = ["Portfolio", "/portfolio"];

/** Only pages that work; what's planned lives on /whats-next. */
export const NAV = [
  ["Dashboard", "/dashboard"],
  ["Farm Financials", "/farm-financials"],
  ["Plan", "/plan"],
  ["Decisions", "/decisions"],
  ["Reports", "/reports"],
  ["Farm Data", "/farm-data"],
];

export const navFor = (advisor) => (advisor ? [PORTFOLIO, ...NAV] : NAV);
