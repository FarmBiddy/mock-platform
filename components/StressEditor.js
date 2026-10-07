import { resetStressTests, saveStressTests } from "@/app/portfolio/actions";
import { Card } from "@/components/ui";
import { STRESS_FIELDS } from "@/lib/financials/whatIf";

/** The advisor's stress tests, used in every client's What-if (and seen by their owners). */
export default function StressEditor({ tests, status }) {
  const input = "w-full rounded-lg border border-stone-300 px-2 py-1.5 tabular-nums";
  return (
    <Card title="Your stress tests" subtitle="Run in every client’s What-if; farmers see them as set by you. Shocks start at the first forecast month.">
      {status && (
        <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {status === "saved" ? "Saved: every client’s What-if uses them now." : "Back to the standard stress tests."}
        </p>
      )}
      {/* key: remount after save so the inputs show the stored values */}
      <form key={JSON.stringify(tests.map((t) => t.values))} action={saveStressTests} className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Name</th>
                {Object.entries(STRESS_FIELDS).map(([field, [label, unit]]) => (
                  <th key={field} className="py-1 pr-3 font-medium">
                    {label} {unit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td className="py-1.5 pr-3">
                    <input name={`${t.id}.label`} maxLength={40} required defaultValue={t.label} aria-label="Stress test name" className={input} />
                  </td>
                  {Object.entries(STRESS_FIELDS).map(([field, [label, unit, min, max]]) => (
                    <td key={field} className="py-1.5 pr-3">
                      <input
                        name={`${t.id}.${field}`}
                        type="number"
                        min={min}
                        max={max}
                        step={field === "rate_shift_pp" ? 0.25 : 1}
                        defaultValue={t.values[field]}
                        aria-label={`${t.label}: ${label} ${unit}`}
                        className={input}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-900">Save stress tests</button>
          {tests.some((t) => t.edited) && (
            <button formAction={resetStressTests} formNoValidate className="rounded-full px-4 py-1.5 text-sm text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">
              Back to the standard ones
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
