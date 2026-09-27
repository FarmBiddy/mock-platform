import { labelForInput } from "@/lib/financial-engine/mapResult";

/**
 * Loading / needs_input / error / unavailable banners.
 * Branches on engine status envelope — does not parse message text for logic.
 */
export default function StatusBanner({ phase, response }) {
  if (phase === "idle") return null;

  if (phase === "loading") {
    return (
      <div
        role="status"
        className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        Contacting Financial Engine…
      </div>
    );
  }

  if (!response) return null;

  if (response.kind === "unavailable") {
    return (
      <div
        role="alert"
        className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <p className="font-medium">Financial Engine unavailable</p>
        <p className="mt-1 text-amber-900">
          {response.message ??
            "Could not reach the engine. Start it separately and try again."}
        </p>
      </div>
    );
  }

  if (response.kind === "needs_input") {
    const missing = response.body?.missing ?? [];
    const code = response.body?.error?.code;
    return (
      <div
        role="alert"
        className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <p className="font-medium">More input required</p>
        {code ? (
          <p className="mt-1 text-xs text-amber-800">Code: {code}</p>
        ) : null}
        {missing.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missing.map((item) => (
              <li key={item.field}>
                {labelForInput(item.field)}
                {item.unit ? (
                  <span className="text-amber-800"> ({item.unit})</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">
            Required field missing:{" "}
            {labelForInput(response.body?.error?.field ?? "unknown")}
          </p>
        )}
      </div>
    );
  }

  if (response.kind === "error") {
    const code = response.body?.error?.code ?? "error";
    const field = response.body?.error?.field;
    return (
      <div
        role="alert"
        className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-medium">Engine error</p>
        <p className="mt-1 text-xs text-red-800">Code: {code}</p>
        {field ? (
          <p className="mt-1">Field: {labelForInput(field)}</p>
        ) : null}
        {response.message ? (
          <p className="mt-1 text-red-900">{response.message}</p>
        ) : null}
      </div>
    );
  }

  if (response.kind === "unknown") {
    return (
      <div
        role="alert"
        className="rounded border border-stone-300 bg-stone-100 px-4 py-3 text-sm text-stone-800"
      >
        {response.message ?? "Unexpected response from Financial Engine."}
      </div>
    );
  }

  if (response.kind === "ok") {
    return (
      <div
        role="status"
        className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        Calculation complete (status: ok)
      </div>
    );
  }

  return null;
}
