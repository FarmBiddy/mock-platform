"use client";

import { labelForInput } from "@/lib/financial-engine/mapResult";
import { FORM_SECTIONS } from "@/lib/financials/sampleInputs";

/**
 * Annual Dairy input form. Collects flat numbers only — no calculations.
 */
export default function AnnualDairyForm({
  values,
  onChange,
  onSubmit,
  onReset,
  isLoading,
}) {
  function handleFieldChange(name, raw) {
    if (raw === "" || raw === null || raw === undefined) {
      onChange(name, "");
      return;
    }
    const parsed = Number(raw);
    onChange(name, Number.isFinite(parsed) ? parsed : raw);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {FORM_SECTIONS.map((section) => (
        <fieldset key={section.id} className="space-y-3">
          <legend className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {section.title}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <label key={field.name} className="flex flex-col gap-1 text-sm">
                <span className="text-stone-700">
                  {labelForInput(field.name)}
                  {field.required ? (
                    <span className="text-amber-700"> *</span>
                  ) : null}
                </span>
                <input
                  type="number"
                  name={field.name}
                  step={field.step}
                  min="0"
                  required={Boolean(field.required)}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="rounded border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Calculating…" : "Calculate annual financials"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="rounded border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          Reset to sample
        </button>
      </div>
    </form>
  );
}
