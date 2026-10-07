import { saveFarmData } from "@/app/farm-data/actions";
import { Card } from "@/components/ui";
import { PRESET_YEARS, effectiveValue } from "@/lib/farm-edits";

const cents = (v) => `${(v * 100).toLocaleString("en-IE", { maximumFractionDigits: 1 })}c`;
const path = (k, field) => `plan_presets.${k}.assumptions.${field}`;

/** One line for a preset the advisor changed (the original note no longer fits): "Milk 44c, 46c, then 47c; costs +3% a year". */
export function presetSummary(farm, k) {
  const [y1, y2, y3] = Array.from({ length: PRESET_YEARS }, (_, i) => effectiveValue(farm, path(k, `milk_price.${i}`)));
  const milk = y1 === y2 && y2 === y3 ? `Milk at ${cents(y1)}` : `Milk ${cents(y1)}, ${cents(y2)}, then ${cents(y3)}`;
  const infl = effectiveValue(farm, path(k, "cost_inflation_pct"));
  return infl == null ? milk : `${milk}; costs ${infl >= 0 ? "+" : ""}${infl}% a year`;
}

/**
 * The advisor's scenario presets for this client: milk price for years 1, 2 and 3+ and cost inflation.
 * Saved like any farm edit (advisor-owned fields), so the farmer's Plan uses them straight away.
 */
export default function PresetEditor({ farm, presetKeys, editedKeys, current }) {
  const input = "w-full rounded-lg border border-stone-300 px-2 py-1.5 tabular-nums";
  return (
    <Card title="Scenario presets for this client" subtitle={`You set these; ${farm.profile.name.split(" ")[0]} sees them as the Plan’s scenarios.`}>
      {/* key: remount after save so the inputs show the stored values */}
      <form key={editedKeys.join()} action={saveFarmData} className="space-y-3">
        <input type="hidden" name="_return" value="plan" />
        <input type="hidden" name="s" value={current} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Preset</th>
                <th className="py-1 pr-3 font-medium">Milk year 1 €/L</th>
                <th className="py-1 pr-3 font-medium">Year 2 €/L</th>
                <th className="py-1 pr-3 font-medium">Year 3+ €/L</th>
                <th className="py-1 font-medium">Costs % a year</th>
              </tr>
            </thead>
            <tbody>
              {presetKeys.map((k) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 font-medium">
                    {farm.plan_presets[k].label}
                    {editedKeys.includes(k) && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">edited</span>}
                  </td>
                  {Array.from({ length: PRESET_YEARS }, (_, i) => (
                    <td key={i} className="py-1.5 pr-3">
                      <input
                        name={path(k, `milk_price.${i}`)}
                        type="number"
                        step="0.005"
                        min="0.2"
                        max="1"
                        required
                        aria-label={`${farm.plan_presets[k].label} milk price, year ${i + 1}${i === PRESET_YEARS - 1 ? " and after" : ""}`}
                        defaultValue={effectiveValue(farm, path(k, `milk_price.${i}`))}
                        className={input}
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <input
                      name={path(k, "cost_inflation_pct")}
                      type="number"
                      step="0.5"
                      min="-10"
                      max="20"
                      required
                      aria-label={`${farm.plan_presets[k].label} cost inflation, % a year`}
                      defaultValue={effectiveValue(farm, path(k, "cost_inflation_pct"))}
                      className={input}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500">Undo with “Reset to demo data” on Farm Data (it resets only your fields).</p>
        <button className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-900">Save presets</button>
      </form>
    </Card>
  );
}
