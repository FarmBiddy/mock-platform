import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { Stat } from "@/components/financials/PlatformCards";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

/** Engine ratios are null when not computable → "—". */
const cents = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c`);
const litres = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-IE")} L`);

/**
 * Milk quality vs the best Irish herds. Placeholders: the figures will come from the processor's
 * milk statements (platform data) and the comparison from an engine benchmark function; neither exists yet.
 */
const QUALITY = [
  ["Cell count (SCC)", "Udder health · lower is better"],
  ["Bacteria (TBC)", "Milk hygiene · lower is better"],
  ["Butterfat", "Higher pays more"],
  ["Protein", "Higher pays more"],
];

function MilkQuality() {
  return (
    <div className="mt-5 border-t border-stone-100 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-stone-800">Milk quality</p>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">Coming soon · from your milk statements</span>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">How your milk compares with the top 10% of Irish herds.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUALITY.map(([label, hint]) => (
          <div key={label} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200/70">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-stone-400">—</p>
            <p className="text-[11px] text-stone-400">Top Irish herds: —</p>
            <p className="mt-1 text-[11px] text-stone-500">{hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dairy key figures from kpi.summary (actual months only), in plain words. Dairy-specific: shown for enterprise "dairy". */
export default function KpiCard({ response, params, describePath }) {
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
      <MilkQuality />
    </Card>
  );
}
