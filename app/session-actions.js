"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADVISOR, CLIENT_COOKIE, ROLE_COOKIE, TIER_COOKIE } from "@/lib/session";

const OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 };

/** Mock login switch: "View as" the farm owner or the advisor. */
export async function viewAs(formData) {
  const jar = await cookies();
  const role = formData.get("role") === "advisor" ? "advisor" : "owner";
  jar.set(ROLE_COOKIE, role, OPTS);
  jar.delete(CLIENT_COOKIE);
  redirect(role === "advisor" ? "/portfolio" : "/dashboard");
}

/** Advisor opens a client's workspace (empty farm → back to the portfolio). */
export async function openClient(formData) {
  const jar = await cookies();
  const farm = formData.get("farm");
  if (!ADVISOR.clients.includes(farm)) {
    jar.delete(CLIENT_COOKIE);
    redirect("/portfolio");
  }
  jar.set(CLIENT_COOKIE, farm, OPTS);
  redirect("/dashboard");
}

/** Demo plan switch for the owner. No redirect: the current page re-renders with the new plan. */
export async function setTier(formData) {
  (await cookies()).set(TIER_COOKIE, formData.get("tier") === "pro" ? "pro" : "free", OPTS);
}
