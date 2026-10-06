import { cookies } from "next/headers";
import { SHARED_COOKIE, cleanShares } from "./shared-core.js";

export * from "./shared-core.js";

/** Scenarios clients shared with the advisor, newest first (demo: kept in this browser). */
export async function readShares() {
  const raw = (await cookies()).get(SHARED_COOKIE)?.value;
  if (!raw) return [];
  try {
    return cleanShares(JSON.parse(raw));
  } catch {
    return [];
  }
}
