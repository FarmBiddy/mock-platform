import { getFarm } from "@/lib/financials/farm";

/**
 * Starter questions for Ask Biddy, by who is asking. Entry points only: the answers are Biddy's
 * (the advisor ones go to its copilot, see docs/biddy-contract.md).
 */
export function suggestionsFor({ role, farmId }) {
  if (role === "owner") return ["Will I have cash for the December feed bill?", "Am I profitable this year?", "How much more could I borrow?"];
  if (!farmId) return ["Which clients need attention this month?", "Who is closest to going overdrawn?", "Compare cost of production across my clients"];
  const first = getFarm(farmId).profile.name.split(" ")[0];
  return ["Summarise this farm for my next visit", `What should I raise with ${first}?`, "Draft the summary for the advisor report"];
}
