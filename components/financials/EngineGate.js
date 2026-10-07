import { labelForInput } from "@/lib/financial-engine/mapResult";

/**
 * Renders `children(result)` on ok. On needs_input asks the farmer for exactly
 * the missing fields (GET form → page re-runs the engine with them). Never invents values.
 *
 * Field names are "<function>:<path>" (path = engine `path`, or the field for top-level
 * inputs) so each answer goes back to the right call and the right place in it.
 * `describePath("months[3].milk_price", fn)` lets the page say which month/loan, e.g. "Apr".
 */
export default function EngineGate({ response, params = {}, describePath = () => null, children }) {
  if (response.status === "ok") return children(response.result);

  if (response.status === "needs_input") {
    return (
      <form className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
        <p className="font-medium text-amber-900">Biddy needs a figure from you to calculate this:</p>
        {Object.entries(params).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {response.missing.map(({ field, unit, path = field }) => (
          <label key={path} className="flex items-center gap-3">
            <span className="w-48 text-stone-700">
              {labelForInput(field)}
              {path !== field && <span className="text-stone-400"> · {describePath(path, response.function) ?? path}</span>}{" "}
              <span className="text-stone-400">({unit})</span>
            </span>
            <input
              name={`${response.function}:${path}`}
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

/**
 * Write the farmer's "<fn>:<path>" answers from the URL into an engine input.
 * Paths look like "opening_cash" or "months[3].milk_price"; only finite numbers are used.
 */
export function withProvided(fn, params, input) {
  for (const [key, value] of Object.entries(params)) {
    const [prefix, path] = key.split(/:(.*)/s);
    const num = Number(value);
    if (prefix !== fn || !path || value === "" || !Number.isFinite(num)) continue;
    const keys = path.split(/[.[\]]/).filter(Boolean).map((k) => (/^\d+$/.test(k) ? Number(k) : k));
    if (keys.some((k) => k === "__proto__" || k === "constructor" || k === "prototype")) continue; // URL is untrusted
    const last = keys.pop();
    const target = keys.reduce((obj, k) => (obj && typeof obj === "object" ? obj[k] : undefined), input);
    if (target && typeof target === "object") target[last] = num;
  }
  return input;
}
