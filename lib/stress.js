import { cookies } from "next/headers";
import { cleanStressEdits, stressTests } from "@/lib/financials/whatIf";

/**
 * The advisor's stress tests, shared by all clients (owners see their advisor's).
 * ponytail: one demo advisor, edits in a cookie; per-advisor in the platform DB with real accounts.
 */
export const STRESS_COOKIE = "fb_stress";

export async function readStressEdits() {
  try {
    return cleanStressEdits(JSON.parse((await cookies()).get(STRESS_COOKIE)?.value ?? "{}"));
  } catch {
    return {};
  }
}

export const readStressTests = async () => stressTests(await readStressEdits());
