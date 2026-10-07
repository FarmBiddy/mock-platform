"use server";

import { riskSensitivity } from "@/lib/financial-engine/client";
import { buildRiskInput, runFarm } from "@/lib/financials/farm";
import { loadFarm } from "@/lib/farm-edits";
import { ALL_SCENARIOS } from "@/lib/financials/whatIf";

/**
 * Run the what-if scenarios the farmer ticked. The browser only sends preset ids (untrusted):
 * unknown ids are dropped, the scenario bodies come from ALL_SCENARIOS.
 */
export async function runWhatIf(ids) {
  const picked = ALL_SCENARIOS.filter((p) => Array.isArray(ids) && ids.includes(p.id));
  const farm = await loadFarm();
  const { inputs, cf } = await runFarm(farm);
  if (cf.status !== "ok") return cf;
  return riskSensitivity(buildRiskInput(farm, inputs, picked.map((p) => ({ name: p.label, ...p.shock }))));
}
