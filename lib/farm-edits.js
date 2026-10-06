import { cookies } from "next/headers";
import { getFarm } from "@/lib/financials/farm";

/**
 * Farmer edits to the demo farm, kept per browser in a cookie so every page, report and Biddy
 * answer recalculates from them. The demo JSON never changes; "Reset" deletes the cookie.
 * ponytail: cookie per browser (~4 KB); move to the platform DB when farms are real.
 */
export { EDIT_COOKIE, cleanEdits, applyEdits, ruleFor, valueAtPath } from "./farm-edits-core.js";
import { EDIT_COOKIE, cleanEdits, applyEdits } from "./farm-edits-core.js";

export async function readEdits() {
  const raw = (await cookies()).get(EDIT_COOKIE)?.value;
  if (!raw) return {};
  try {
    return cleanEdits(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** The demo farm with this browser's edits applied; `editCount` says how many fields differ. */
export async function loadFarm() {
  const edits = await readEdits();
  const farm = applyEdits(getFarm(), edits);
  farm.editCount = Object.keys(edits).length;
  return farm;
}
