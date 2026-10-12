import { cookies } from "next/headers";
import { FARMS } from "@/lib/financials/farm";

/**
 * Mock "who is looking": a role and, for the advisor, the client farm open. No real auth.
 * ponytail: cookies per browser; replace with platform login + farm access rights.
 */
export const ROLE_COOKIE = "fb_role";
export const CLIENT_COOKIE = "fb_client";
export const TIER_COOKIE = "fb_tier";
export const OWNER_COOKIE = "fb_owner";
/** The advisor login is parked while we work on the farmer's experience: hidden from "View as", and everyone is a farmer. */
export const ADVISOR_LOGIN = false;

/** Demo farmer logins: Joe (a year of records) and Seán (new: starter estimates). The first is the default. */
export const OWNER_FARMS = ["joe-bloggs", "sean-doyle"];
export const OWNER_FARM = OWNER_FARMS[0];
export const ADVISOR = {
  name: "Mary Ryan",
  initials: "MR",
  org: "Ryan Agri Advisory",
  clients: Object.keys(FARMS).filter((id) => !FARMS[id].profile.starter),
};

/**
 * The owner is on Free or Pro (demo switch, default Free); the advisor (B2B plan) always has every feature.
 * @returns {Promise<{ role: "owner" | "advisor", farmId: string | null, tier: "free" | "pro", pro: boolean }>}
 *   farmId null = advisor with no client open
 */
export async function getViewer() {
  const jar = await cookies();
  if (!ADVISOR_LOGIN || jar.get(ROLE_COOKIE)?.value !== "advisor") {
    const tier = jar.get(TIER_COOKIE)?.value === "pro" ? "pro" : "free";
    const owner = jar.get(OWNER_COOKIE)?.value;
    return { role: "owner", farmId: OWNER_FARMS.includes(owner) ? owner : OWNER_FARM, tier, pro: tier === "pro" };
  }
  const client = jar.get(CLIENT_COOKIE)?.value;
  return { role: "advisor", farmId: ADVISOR.clients.includes(client) ? client : null, tier: "pro", pro: true };
}

/** Which chats belong together: the owner's farm, the advisor's portfolio, or the advisor inside one client. */
export const chatContext = ({ role, farmId }) => `${role}:${farmId ?? "portfolio"}`;
