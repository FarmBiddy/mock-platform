import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { Stat } from "@/components/financials/PlatformCards";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import { MILK_METRICS, compareToAverage } from "@/lib/benchmarks-core";

/** Engine ratios are null when not computable → "—". */
const cents = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c`);
const litres = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-IE")} L`);

const POSITION = { above: "Above average", below: "Below average", about: "About average" };
const TONE = { good: "bg-emerald-50 text-emerald-800 ring-emerald-200", bad: "bg-amber-50 text-amber-800 ring-amber-200", even: "bg-stone-100 text-stone-700 ring-stone-200" };

/**
 * Milk quality vs the average: one clean tile per measure (name, the farm's figure, the average, a coloured
 * label); sources and "which way is better" go once in the footer. Averages: lib/benchmarks.js (ICBF weekly
 * SCC by province, CSO monthly fat / protein). Farm figures: the latest month's co-op milk statement, shown
 * as recorded (no maths); when milk.quality (engine 1.1.0) reaches main they become the engine's litre-weighted
 * figures for the year.
 * @param {{ benchmarks: Record<string, { label: string, average: number, source: string } | null>,
 *   statement?: { label: string, values: Record<string, number> } | null }} props
 */
function MilkQuality({ benchmarks, statement = null }) {
  // one footer line per source: "butterfat and protein: CSO, …"
  const bySource = {};
  for (const [metric, b] of Object.entries(benchmarks ?? {})) if (b) (bySource[b.source] ??= []).push(MILK_METRICS[metric].label.toLowerCase());
  const sources = Object.entries(bySource).map(([source, names]) => `${names.join(" and ")}: ${source}`);
  return (
    <div className="mt-5 border-t border-stone-100 pt-4">
      <p className="text-sm font-semibold text-stone-800">Milk quality</p>
      <p className="mt-0.5 text-xs text-stone-500">
        {statement ? `From your ${statement.label} milk statement, compared with other Irish herds.` : "Compared with other Irish herds."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(MILK_METRICS).map(([metric, m]) => {
          const avg = benchmarks?.[metric];
          const farm = statement?.values?.[metric];
          const vs = compareToAverage(metric, farm, avg?.average);
          const tone = !vs ? null : vs.good === null ? TONE.even : vs.good ? TONE.good : TONE.bad;
          return (
            <div key={metric} className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <p className="text-sm font-medium text-stone-700">{m.label}</p>
              <p className="mt-1">
                <span className={`text-2xl font-semibold tabular-nums ${farm == null ? "text-stone-300" : "text-stone-900"}`}>{farm == null ? "—" : m.value(farm)}</span>
                {farm != null && <span className="ml-1 text-xs text-stone-500">{m.unit}</span>}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{avg ? `${avg.label} ${m.value(avg.average)}${m.unit === "%" ? "%" : ""}` : "No average published yet"}</p>
              {vs && <span className={`mt-2 self-start rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>{POSITION[vs.position]}{vs.good ? " ✓" : ""}</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Lower is better for cell count and bacteria; higher is better for butterfat and protein. Averages: {sources.join(" · ")}.
      </p>
    </div>
  );
}

/** Dairy key figures from kpi.summary (actual months only), in plain words. Dairy-specific: shown for enterprise "dairy". */
export default function KpiCard({ response, params, describePath, milkBenchmarks, milkStatement }) {
  return (
    <Card
      title="Key figures"
      subtitle={response.status === "ok" ? `Per litre of milk and per cow, ${monthLabel(response.result.from.month)}–${monthLabel(response.result.to.month)}` : null}
      badge={<Badge>kpi.summary</Badge>}
    >
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="It costs you, per litre" value={cents(r.per_litre_c.costs)} hint="to produce a litre of milk" />
            <Stat label="You earn, per litre" value={cents(r.per_litre_c.revenue)} hint="milk, schemes and other income" />
            <Stat label="Left over, per litre" value={cents(r.per_litre_c.operating_surplus)} hint="earned minus cost" />
            <Stat label="Left over, per cow" value={formatCurrency(r.per_cow.operating_surplus, r.currency)} hint={`${r.milking_cows} cows`} />
            <Stat label="Milk per cow" value={litres(r.per_cow.milk_litres)} hint="so far this year" />
            <Stat label="Loans, per cow" value={r.debt ? formatCurrency(r.debt.per_cow, r.currency) : "—"} hint={r.debt ? `${formatCurrency(r.debt.balance, r.currency)} in total` : null} />
          </div>
        )}
      </EngineGate>
      <MilkQuality benchmarks={milkBenchmarks} statement={milkStatement} />
    </Card>
  );
}
