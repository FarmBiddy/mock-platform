import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFarm } from "@/lib/financials/farm";
import { getViewer } from "@/lib/session";

/**
 * Farmer edits to a demo farm, kept per browser in one cookie per farm so every page, report and
 * Biddy answer recalculates from them. The demo JSON never changes; "Reset" deletes the cookie.
 * ponytail: cookie per browser (~4 KB); move to the platform DB when farms are real.
 */
export { cleanEdits, applyEdits, ownerOf, ruleFor, valueAtPath } from "./farm-edits-core.js";
import { cleanEdits, applyEdits } from "./farm-edits-core.js";

export const editCookie = (farmId) => `fb_farm_edits_${farmId}`;

export async function readEdits(farmId) {
  const raw = (await cookies()).get(editCookie(farmId))?.value;
  if (!raw) return {};
  try {
    return cleanEdits(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** The viewer's farm id; an advisor with no client open goes to the portfolio. */
export async function currentFarmId() {
  return (await getViewer()).farmId ?? redirect("/portfolio");
}

/** A demo farm (default: the one being viewed) with this browser's edits applied; `editCount` says how many fields differ. */
export async function loadFarm(farmId) {
  farmId ??= await currentFarmId();
  const edits = await readEdits(farmId);
  const farm = applyEdits(getFarm(farmId), edits);
  farm.editCount = Object.keys(edits).length;
  return farm;
}
