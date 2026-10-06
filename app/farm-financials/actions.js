"use server";

import { riskSensitivity } from "@/lib/financial-engine/client";
import { buildRiskInput, getFarm, runFarm } from "@/lib/financials/farm";
import { WHAT_IF_PRESETS } from "@/lib/financials/whatIf";

/**
 * Run the what-if scenarios the farmer ticked. The browser only sends preset ids (untrusted):
 * unknown ids are dropped, the scenario bodies come from WHAT_IF_PRESETS.
 */
export async function runWhatIf(ids) {
  const picked = WHAT_IF_PRESETS.filter((p) => Array.isArray(ids) && ids.includes(p.id));
  const { inputs, cf } = await runFarm(getFarm());
  if (cf.status !== "ok") return cf;
  return riskSensitivity(buildRiskInput(inputs, picked.map((p) => ({ name: p.label, ...p.shock }))));
}
