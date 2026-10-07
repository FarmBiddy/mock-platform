"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOTES_COOKIE, NOTE_MAX, readNotes } from "@/lib/notes";
import { ADVISOR, CLIENT_COOKIE, ROLE_COOKIE, TIER_COOKIE, getViewer } from "@/lib/session";

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

/** The advisor's private note on the client that is open. */
export async function saveNote(formData) {
  const { role, farmId } = await getViewer();
  if (role !== "advisor" || !farmId) return;
  const notes = { ...(await readNotes()), [farmId]: String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX) };
  (await cookies()).set(NOTES_COOKIE, JSON.stringify(notes), OPTS);
}

/** Start the demo again: drop every demo cookie (role, plan, client, edits, shares, notes, stress tests). */
export async function resetDemo() {
  const jar = await cookies();
  for (const { name } of jar.getAll()) if (name.startsWith("fb_")) jar.delete(name);
  redirect("/dashboard");
}
