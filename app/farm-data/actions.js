"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cleanEdits, currentFarmId, editCookie, ownerOf, readEdits, ruleFor, valueAtPath } from "@/lib/farm-edits";
import { forecastMilkPrice, getFarm } from "@/lib/financials/farm";
import { getViewer } from "@/lib/session";

const OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 };

/** Percent inputs in the form; stored as the engine's 0–1 ratio. */
const PERCENT = { "new_loan_terms.annual_rate_pct": "new_loan_terms.annual_rate" };

/**
 * Save the form. Only whitelisted fields; a value equal to the demo data drops the edit;
 * an empty field (where allowed) becomes null so the engine asks for it.
 * Each role only changes its own fields: the farmer the records, the advisor the assumptions.
 */
export async function saveFarmData(formData) {
  const farmId = await currentFarmId();
  const { role } = await getViewer();
  const base = getFarm(farmId);
  const edits = await readEdits(farmId);
  for (const [name, raw] of formData.entries()) {
    const path = PERCENT[name] ?? name;
    const rule = ruleFor(path);
    if (!rule || ownerOf(path) !== role || typeof raw !== "string") continue;
    const text = raw.trim();
    let value = text === "" ? null : Number(text);
    if (value !== null && !Number.isFinite(value)) continue;
    if (value !== null && PERCENT[name]) value = value / 100; // unit conversion only
    if (value === null && !rule.empty) continue;
    // A month line the demo data doesn't have is 0 (engine default); other missing fields are null.
    const baseValue =
      path === "market.milk_price"
        ? forecastMilkPrice(base, base.actual_through_month + 1) // default comes from the market adapter
        : (valueAtPath(base, path) ?? (path.startsWith("months.") ? 0 : null));
    if (value === baseValue) delete edits[path];
    else edits[path] = value;
  }
  const clean = cleanEdits(edits);
  (await cookies()).set(editCookie(farmId), JSON.stringify(clean), OPTS);
  const month = Number(formData.get("_month"));
  redirect(`/farm-data?saved=1${month ? `&m=${month}` : ""}`);
}

/** Back to the demo data for this role's fields; the other role's changes stay. */
export async function resetFarmData() {
  const farmId = await currentFarmId();
  const { role } = await getViewer();
  const kept = Object.fromEntries(Object.entries(await readEdits(farmId)).filter(([path]) => ownerOf(path) !== role));
  (await cookies()).set(editCookie(farmId), JSON.stringify(kept), OPTS);
  redirect("/farm-data?reset=1");
}
