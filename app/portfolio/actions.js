"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STRESS_FIELDS, cleanStressEdits, stressTests } from "@/lib/financials/whatIf";
import { STRESS_COOKIE } from "@/lib/stress";
import { getViewer } from "@/lib/session";

const OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 };

/** The advisor saves the stress tests (form fields "<test id>.<field>"); values equal to the defaults drop out. */
export async function saveStressTests(formData) {
  if ((await getViewer()).role !== "advisor") redirect("/dashboard");
  const defaults = Object.fromEntries(stressTests().map((t) => [t.id, t.values]));
  const raw = {};
  for (const [name, value] of formData.entries()) {
    const [id, field] = String(name).split(".");
    if (!defaults[id] || typeof value !== "string") continue;
    const v = field === "label" ? value.trim() : value.trim() === "" ? 0 : Number(value);
    if ((field === "label" || STRESS_FIELDS[field]) && v !== defaults[id][field]) (raw[id] ??= {})[field] = v;
  }
  (await cookies()).set(STRESS_COOKIE, JSON.stringify(cleanStressEdits(raw)), OPTS);
  redirect("/portfolio?stress=saved");
}

export async function resetStressTests() {
  if ((await getViewer()).role !== "advisor") redirect("/dashboard");
  (await cookies()).delete(STRESS_COOKIE);
  redirect("/portfolio?stress=reset");
}
