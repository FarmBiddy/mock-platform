/** Advisor-only entry, shown first when viewing as the advisor. */
const PORTFOLIO = ["Portfolio", "/portfolio"];

export const NAV = [
  ["Dashboard", "/dashboard"],
  ["Farm Financials", "/farm-financials"],
  ["Plan", "/plan"],
  ["Decisions", "/decisions"],
  ["Reports", "/reports"],
  ["Farm Data", "/farm-data"],
  ["Documents", "/documents"],
  ["Notifications", "/notifications"],
  ["Events", "/events"],
  ["Tasks", "/tasks"],
  ["Invoices", "/invoices"],
  ["Schemes", "/schemes"],
  ["Processors", "/processors"],
  ["Suppliers", "/suppliers"],
  ["Farm Actions", "/farm-actions"],
];

export const navFor = (advisor) => (advisor ? [PORTFOLIO, ...NAV] : NAV);
