import { MOCK_CHART_SERIES } from "@/data/platform-mocks/chartSeries";

/** Platform mock Jan–Dec bars — not from Financial Engine. */
export default function AnnualChart() {
  const max = Math.max(...MOCK_CHART_SERIES.map((d) => d.value));

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">
          Jan–Dec activity
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          Platform mock
        </span>
      </div>
      <div className="rounded border border-stone-200 bg-white p-4">
        <div className="flex h-36 items-end gap-1.5">
          {MOCK_CHART_SERIES.map((point) => {
            const heightPct = max > 0 ? (point.value / max) * 100 : 0;
            return (
              <div
                key={point.month}
                className="flex flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full rounded-t bg-emerald-700/80"
                  style={{ height: `${heightPct}%`, minHeight: "4px" }}
                  title={`${point.month}: ${point.value}`}
                />
                <span className="text-[10px] text-stone-500">{point.month}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Illustrative monthly series for the mock platform only.
        </p>
      </div>
    </section>
  );
}
