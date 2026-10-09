import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { Stat } from "@/components/financials/PlatformCards";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import { MILK_METRICS, compareToAverage } from "@/lib/benchmarks-core";

/** Engine ratios are null when not computable → "—". */
const cents = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c`);
const litres = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-IE")} L`);

const POSITION = {
  above: "Above average",
  below: "Below average",
  about: "About average",
};

/**
 * Milk quality vs the Irish average: SCC, TBC, butterfat, protein. Averages come from lib/benchmarks.js
 * (CSO live for fat / protein, ICBF by hand for SCC); the farm's own figures will come from milk.quality
 * (engine 1.1.0, from the co-op's milk statements) — until then `quality` is null and they show "—".
 * @param {{ benchmarks: Record<string, { label: string, average: number, source: string } | null>, quality?: Record<string, number> | null }} props
 */
function MilkQuality({ benchmarks, quality = null }) {
  return (
    <div className="mt-5 border-t border-stone-100 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-stone-800">Milk quality</p>
        {!quality && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">Your figures: coming soon, from your milk statements</span>}
      </div>
      <p className="mt-0.5 text-xs text-stone-500">How your milk compares with the average for Irish herds.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(MILK_METRICS).map(([metric, m]) => {
          const avg = benchmarks?.[metric];
          const farm = quality?.[metric];
          const vs = compareToAverage(metric, farm, avg?.average);
          const tone = !vs ? "" : vs.good === null ? "bg-stone-100 text-stone-700" : vs.good ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800";
          return (
            <div key={metric} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200/70">
              <p className="text-xs text-stone-500">{m.label}</p>
              <p className={`mt-1 text-lg font-semibold ${farm == null ? "text-stone-400" : "text-stone-900"}`}>{farm == null ? "—" : m.show(farm)}</p>
              {vs && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{POSITION[vs.position]}</span>}
              <p className="mt-1 text-[11px] text-stone-600">{avg?.label ?? "Irish average"}: {avg ? m.show(avg.average) : "not published yet"}</p>
              {avg && <p className="text-[10px] text-stone-400">{avg.source}</p>}
              <p className="mt-1 text-[11px] text-stone-500">{m.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Dairy key figures from kpi.summary (actual months only), in plain words. Dairy-specific: shown for enterprise "dairy". */
export default function KpiCard({ response, params, describePath, milkBenchmarks }) {
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
      <MilkQuality benchmarks={milkBenchmarks} />
    </Card>
  );
}
