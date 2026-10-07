/** Advisor-only entries: the portfolio first, the decision tools after the Plan. */
const PORTFOLIO = ["Portfolio", "/portfolio"];
const DECISIONS = ["Decisions", "/decisions"];

export const NAV = [
  ["Dashboard", "/dashboard"],
  ["Farm Financials", "/farm-financials"],
  ["Plan", "/plan"],
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

export const navFor = (advisor) => (advisor ? [PORTFOLIO, ...NAV.flatMap((item) => (item[1] === "/plan" ? [item, DECISIONS] : [item]))] : NAV);
