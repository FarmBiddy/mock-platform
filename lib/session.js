import { cookies } from "next/headers";
import { FARMS } from "@/lib/financials/farm";

/**
 * Mock "who is looking": a role and, for the advisor, the client farm open. No real auth.
 * ponytail: cookies per browser; replace with platform login + farm access rights.
 */
export const ROLE_COOKIE = "fb_role";
export const CLIENT_COOKIE = "fb_client";
export const TIER_COOKIE = "fb_tier";

export const OWNER_FARM = "joe-bloggs";
export const ADVISOR = { name: "Mary Ryan", initials: "MR", org: "Ryan Agri Advisory", clients: Object.keys(FARMS) };

/**
 * The owner is on Free or Pro (demo switch, default Free); the advisor (B2B plan) always has every feature.
 * @returns {Promise<{ role: "owner" | "advisor", farmId: string | null, tier: "free" | "pro", pro: boolean }>}
 *   farmId null = advisor with no client open
 */
export async function getViewer() {
  const jar = await cookies();
  if (jar.get(ROLE_COOKIE)?.value !== "advisor") {
    const tier = jar.get(TIER_COOKIE)?.value === "pro" ? "pro" : "free";
    return { role: "owner", farmId: OWNER_FARM, tier, pro: tier === "pro" };
  }
  const client = jar.get(CLIENT_COOKIE)?.value;
  return { role: "advisor", farmId: ADVISOR.clients.includes(client) ? client : null, tier: "pro", pro: true };
}

/** Which chats belong together: the owner's farm, the advisor's portfolio, or the advisor inside one client. */
export const chatContext = ({ role, farmId }) => `${role}:${farmId ?? "portfolio"}`;
