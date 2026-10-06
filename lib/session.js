import { cookies } from "next/headers";
import { FARMS } from "@/lib/financials/farm";

/**
 * Mock "who is looking": a role and, for the advisor, the client farm open. No real auth.
 * ponytail: cookies per browser; replace with platform login + farm access rights.
 */
export const ROLE_COOKIE = "fb_role";
export const CLIENT_COOKIE = "fb_client";

export const OWNER_FARM = "joe-bloggs";
export const ADVISOR = { name: "Mary Ryan", initials: "MR", org: "Ryan Agri Advisory", clients: Object.keys(FARMS) };

/** @returns {Promise<{ role: "owner" | "advisor", farmId: string | null }>} farmId null = advisor with no client open */
export async function getViewer() {
  const jar = await cookies();
  if (jar.get(ROLE_COOKIE)?.value !== "advisor") return { role: "owner", farmId: OWNER_FARM };
  const client = jar.get(CLIENT_COOKIE)?.value;
  return { role: "advisor", farmId: ADVISOR.clients.includes(client) ? client : null };
}
