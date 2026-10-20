"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { applyEdits, canEdit, cleanEdits, currentFarmId, editCookie, effectiveValue, loadFarm, readEdits, ruleFor, scaleForTarget } from "@/lib/farm-edits";
import { readAccounts } from "@/lib/accounts-import";
import { forecastMilkPrice, getFarm } from "@/lib/financials/farm";
import { getViewer } from "@/lib/session";

const OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 };

/** Percent inputs in the form; stored as the engine's 0–1 ratio. */
const PERCENT = { "new_loan_terms.annual_rate_pct": "new_loan_terms.annual_rate" };

const YEAR = "year."; // a year-so-far figure for a month field → one months_scale factor
const CENTS = "c:"; // a milk price typed in cents per litre → stored in €/litre

/**
 * Write the form's fields to the edit cookie. Only whitelisted fields; a value equal to the demo data drops the edit;
 * an empty field (where allowed) becomes null so the engine asks for it.
 * Each role only changes its own fields: the farmer the records, the advisor the assumptions.
 */
async function writeEdits(formData) {
  const farmId = await currentFarmId();
  const { role } = await getViewer();
  const base = getFarm(farmId);
  const edits = await readEdits(farmId);
  for (let [name, raw] of formData.entries()) {
    if (typeof raw !== "string") continue;
    if (name.startsWith(CENTS)) {
      name = name.slice(CENTS.length);
      if (raw.trim() !== "" && Number.isFinite(Number(raw))) raw = String(+(Number(raw) / 100).toFixed(6)); // unit only
    }
    if (name.startsWith(YEAR)) {
      const field = name.slice(YEAR.length);
      const target = Number(raw.trim());
      const path = `months_scale.${field}`;
      if (!ruleFor(path) || !canEdit(role, farmId, path) || raw.trim() === "" || !Number.isFinite(target) || target < 0) continue;
      const factor = scaleForTarget(base, edits, field, target);
      if (factor == null) {
        // Nothing of the farm's own to scale (a new farmer, or a payment not made yet): keep the total itself,
        // spread in a typical seasonal pattern.
        delete edits[path];
        edits[`months_total.${field}`] = target;
      } else {
        delete edits[`months_total.${field}`];
        if (Math.abs(factor - 1) < 1e-6) delete edits[path];
        else edits[path] = +factor.toFixed(6);
      }
      continue;
    }
    const path = PERCENT[name] ?? name;
    const rule = ruleFor(path);
    if (!rule || !canEdit(role, farmId, path)) continue;
    const text = raw.trim();
    if (rule.choices) {
      // a pick from a list (tax profile): kept as text
      if (!rule.choices.includes(text)) continue;
      if (text === effectiveValue(getFarm(farmId), path)) delete edits[path];
      else edits[path] = text;
      continue;
    }
    let value = text === "" ? null : Number(text);
    if (value !== null && !Number.isFinite(value)) continue;
    if (value !== null && PERCENT[name]) value = value / 100; // unit conversion only
    if (value === null && !rule.empty) continue;
    // A month line the demo data doesn't have is 0 (engine default); other missing fields are null.
    // A month compares with what it shows without its own edit (a year total may have scaled it).
    const { [path]: _, ...others } = edits;
    const baseValue =
      path === "market.milk_price"
        ? forecastMilkPrice(base, base.actual_through_month + 1) // default comes from the market adapter
        : path.startsWith("months.")
          ? (effectiveValue(applyEdits(base, others), path) ?? 0)
          : effectiveValue(base, path) ?? null;
    if (value === baseValue) delete edits[path];
    else edits[path] = value;
  }
  (await cookies()).set(editCookie(farmId), JSON.stringify(cleanEdits(edits)), OPTS);
}

/** Autosave of one field from the Farm data page: no redirect, the page refreshes itself. */
export async function autosaveFarmData(formData) {
  await writeEdits(formData);
}

/** Form submit (Plan presets, or the Farm data page without JavaScript). */
export async function saveFarmData(formData) {
  await writeEdits(formData);
  if (formData.get("_return") === "plan") {
    // preset form on the Plan page: back to the scenario being viewed
    const s = formData.get("s");
    redirect(`/plan?presets=saved${/^(cautious|base|optimistic)$/.test(s) ? `&s=${s}` : ""}`);
  }
  const month = Number(formData.get("_month"));
  redirect(`/farm-data?saved=1${month ? `&m=${month}` : ""}`);
}

/** Back to the demo data for this role's fields; the other role's changes stay. */
export async function resetFarmData() {
  const farmId = await currentFarmId();
  const { role } = await getViewer();
  const kept = Object.fromEntries(Object.entries(await readEdits(farmId)).filter(([path]) => !canEdit(role, farmId, path)));
  (await cookies()).set(editCookie(farmId), JSON.stringify(kept), OPTS);
  redirect(`/farm-data?reset=${Date.now()}`); // a new value each time, so the form remounts with the demo figures
}

const MAX_PDF = 10 * 1024 * 1024;

/**
 * Step 1 of "upload last year's accounts": read the PDF and say what was found. Nothing is saved yet;
 * the farmer reviews the figures first (step 2, applyAccounts).
 */
export async function readAccountsFile(_previous, formData) {
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { error: "Choose your accounts PDF first." };
  if (file.size > MAX_PDF) return { error: "That file is over 10 MB. Try the PDF your accountant emailed you." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { error: "That isn’t a PDF. Upload the PDF of your accounts." };
  let pages;
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    ({ text: pages } = await extractText(await getDocumentProxy(bytes), { mergePages: false }));
  } catch {
    return { error: "We couldn’t read that PDF. If it’s a scan, ask your accountant for the digital copy." };
  }
  const farm = await loadFarm();
  const result = readAccounts(pages, farm);
  if (!result.found.length) return { error: result.skipped[0] ?? "We couldn’t find any figures we know in that PDF." };
  return { fileName: file.name, ...result };
}

/** Step 2: the farmer said "use these figures". The edits came back from the browser, so they're checked again. */
export async function applyAccounts(formData) {
  const farmId = await currentFarmId();
  const { role } = await getViewer();
  let incoming = {};
  try {
    incoming = JSON.parse(String(formData.get("edits") ?? "{}"));
  } catch {
    redirect("/farm-data");
  }
  const allowed = Object.fromEntries(Object.entries(cleanEdits(incoming)).filter(([path]) => canEdit(role, farmId, path)));
  const edits = { ...(await readEdits(farmId)), ...allowed };
  (await cookies()).set(editCookie(farmId), JSON.stringify(cleanEdits(edits)), OPTS);
  redirect(`/farm-data?imported=${Number(allowed["tax.last_year"]) || 1}`);
}
