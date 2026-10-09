import { getFarm } from "@/lib/financials/farm";

/**
 * Starter questions for Ask Biddy, by who is asking. Entry points only: the answers are Biddy's
 * (the advisor ones go to its copilot, see docs/biddy-contract.md).
 */
export function suggestionsFor({ role, farmId }) {
  if (role === "owner") return ["Will I have cash for the December feed bill?", "Am I profitable this year?", "How much more could I borrow?"];
  // Portfolio copilot questions wait for Biddy's copilot agent (see /whats-next); none offered until then.
  if (!farmId) return [];
  const first = getFarm(farmId).profile.name.split(" ")[0];
  return [`Will ${first} have cash for the December feed bill?`, `Is ${first} profitable this year?`, `How much more could ${first} borrow?`];
}
