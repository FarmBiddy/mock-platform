"use server";

import { riskSensitivity } from "@/lib/financial-engine/client";
import { buildRiskInput, runFarm } from "@/lib/financials/farm";
import { loadFarm } from "@/lib/farm-edits";
import { FREE_SCENARIO_IDS, WHAT_IF_PRESETS } from "@/lib/financials/whatIf";
import { readStressTests } from "@/lib/stress";
import { getViewer } from "@/lib/session";

/**
 * Run the what-if scenarios the farmer ticked. The browser only sends preset ids (untrusted):
 * unknown ids are dropped, the scenario bodies come from the presets and the advisor's stress tests.
 * Free owners only get the Free ones.
 */
export async function runWhatIf(ids) {
  const { pro } = await getViewer();
  const picked = [...WHAT_IF_PRESETS, ...(await readStressTests())].filter((p) => Array.isArray(ids) && ids.includes(p.id) && (pro || FREE_SCENARIO_IDS.includes(p.id)));
  const farm = await loadFarm();
  const { inputs, cf } = await runFarm(farm);
  if (cf.status !== "ok") return cf;
  return riskSensitivity(buildRiskInput(farm, inputs, picked.map((p) => ({ name: p.label, ...p.shock }))));
}
