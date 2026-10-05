import { labelForInput } from "@/lib/financial-engine/mapResult";

/**
 * Renders `children(result)` on ok. On needs_input asks the farmer for exactly
 * the missing fields (GET form → page re-runs the engine with them). Never invents values.
 *
 * Field names are "<function>:<field>" so answers go back to the right call.
 */
export default function EngineGate({ response, params = {}, children }) {
  if (response.status === "ok") return children(response.result);

  if (response.status === "needs_input") {
    return (
      <form className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
        <p className="font-medium text-amber-900">Biddy needs a figure from you to calculate this:</p>
        {Object.entries(params).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {response.missing.map(({ field, unit }) => (
          <label key={field} className="flex items-center gap-3">
            <span className="w-48 text-stone-700">
              {labelForInput(field)} <span className="text-stone-400">({unit})</span>
            </span>
            <input
              name={`${response.function}:${field}`}
              type="number"
              step="any"
              required
              className="w-40 rounded-lg border border-stone-300 bg-white px-2 py-1"
            />
          </label>
        ))}
        <button className="rounded-lg bg-emerald-800 px-3 py-1.5 font-medium text-white hover:bg-emerald-900">
          Calculate
        </button>
      </form>
    );
  }

  return (
    <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      <p className="font-medium">Couldn’t calculate ({response.error?.code})</p>
      <p className="mt-1">{response.error?.message}</p>
    </div>
  );
}

/** Pull "<fn>:<field>" numeric answers out of the URL for one engine function. */
export function providedFor(fn, params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    const [prefix, field] = key.split(":");
    const num = Number(value);
    if (prefix === fn && field && value !== "" && Number.isFinite(num)) out[field] = num;
  }
  return out;
}
