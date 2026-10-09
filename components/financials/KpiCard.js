import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { labelForCost } from "@/lib/financial-engine/mapResult";
import { monthLabel } from "@/lib/format/date";
import { MILK_METRICS } from "@/lib/benchmarks-core";

/** Engine ratios are null when not computable → "—". */
const cents = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c`);
const litres = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-IE")} L`);

const POSITION = { above: "Above average", below: "Below average", about: "About average" };
const TONE = { good: "bg-emerald-50 text-emerald-800 ring-emerald-200", bad: "bg-amber-50 text-amber-800 ring-amber-200", even: "bg-stone-100 text-stone-700 ring-stone-200" };

/** A sub-section of Key figures: its own tinted panel with an icon and a clear heading, so it doesn't blend into the card. */
function Panel({ icon, title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200/80 ${className}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg ring-1 ring-stone-200">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold text-stone-900">{title}</h3>
          {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** "Sept 2026" / "Oct 2025 – Sept 2026" from an engine from/to pair. */
const span = (from, to) =>
  from.year === to.year && from.month === to.month ? `${monthLabel(from.month)} ${from.year}` : `${monthLabel(from.month)} ${from.year} – ${monthLabel(to.month)} ${to.year}`;

/**
 * Milk quality from milk.quality (engine 1.1.0): one clean tile per measure — the latest statement month's
 * figure, the average (same season, so a fair comparison) and the engine's verdict (position + whether it is
 * better). Underneath, one line for the last 12 months (litre-weighted) and the EU limits. The platform only
 * supplies the averages (lib/benchmarks.js) and the words; every comparison is the engine's.
 * @param {{ benchmarks: Record<string, { label: string, average: number, source: string } | null>,
 *   latest?: object | null, year?: object | null }} props  latest / year: milk.quality responses
 */
function MilkQuality({ benchmarks, latest = null, year = null }) {
  const now = latest?.status === "ok" ? latest.result : null;
  const twelve = year?.status === "ok" ? year.result : null;
  // one footer line per source: "butterfat and protein: CSO, …"
  const bySource = {};
  for (const [metric, b] of Object.entries(benchmarks ?? {})) if (b) (bySource[b.source] ??= []).push(MILK_METRICS[metric].label.toLowerCase());
  const sources = Object.entries(bySource).map(([source, names]) => `${names.join(" and ")}: ${source}`);
  const breaches = twelve ? [...twelve.compliance.scc_breach_months.map(() => "cell count"), ...twelve.compliance.tbc_breach_months.map(() => "bacteria")] : [];
  return (
    <Panel
      icon="🧪"
      title="Milk quality"
      subtitle={now ? `Your ${span(now.from, now.to)} milk statement, compared with other Irish herds at the same time of year` : "From your co-op milk statements"}
      className="mt-4"
    >
      {!now && latest && <p className="mb-2 text-xs text-stone-500">Couldn’t read the milk statements: {latest.error?.message ?? "missing figures"}.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(MILK_METRICS).map(([metric, m]) => {
          const avg = benchmarks?.[metric];
          const farm = now?.period?.[metric];
          const vs = now?.vs_benchmarks?.[metric];
          const tone = !vs?.position ? null : vs.better_than_average == null ? TONE.even : vs.better_than_average ? TONE.good : TONE.bad;
          return (
            <div key={metric} className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <p className="text-sm font-medium text-stone-700">{m.label}</p>
              <p className="mt-1">
                <span className={`text-2xl font-semibold tabular-nums ${farm == null ? "text-stone-300" : "text-stone-900"}`}>{farm == null ? "—" : m.value(farm)}</span>
                {farm != null && <span className="ml-1 text-xs text-stone-500">{m.unit}</span>}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{avg ? `${avg.label} ${m.value(avg.average)}${m.unit === "%" ? "%" : ""}` : "No average published yet"}</p>
              {tone && (
                <span className={`mt-2 self-start rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>
                  {POSITION[vs.position]}
                  {vs.better_than_average ? " ✓" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {twelve && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">
          <strong>Last 12 months</strong> ({span(twelve.from, twelve.to)}): cell count {MILK_METRICS.scc_k.value(twelve.period.scc_k)}, bacteria{" "}
          {MILK_METRICS.tbc_k.value(twelve.period.tbc_k)}, butterfat {MILK_METRICS.fat_pct.value(twelve.period.fat_pct)}%, protein{" "}
          {MILK_METRICS.protein_pct.value(twelve.period.protein_pct)}%.{" "}
          {breaches.length === 0 ? (
            <span className="text-emerald-700">Within the EU milk limits every month ✓</span>
          ) : (
            <span className="text-amber-800">
              Over the EU limit for {[...new Set(breaches)].join(" and ")} in {breaches.length} month{breaches.length === 1 ? "" : "s"}: talk to your vet or co-op, as it can stop milk collection.
            </span>
          )}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Lower is better for cell count and bacteria; higher is better for butterfat and protein. Averages: {sources.join(" · ")}.
      </p>
    </Panel>
  );
}

const euros = (v, currency) => (v == null ? "—" : formatCurrency(v, currency));

/**
 * One amount split in two: the whole bar is what comes in, the coral part pays costs, the green part is
 * yours. Widths are shares of the engine's figures (bar geometry only). When costs are bigger than what
 * comes in, there is no green part and a gentle amber note says so (never red).
 */
function SplitBar({ total, costs, left, show }) {
  const losing = left != null && left < 0;
  const costShare = total > 0 ? Math.min(costs / total, 1) * 100 : 100;
  return (
    <div className="mt-3">
      <div className="flex h-7 overflow-hidden rounded-lg text-xs font-medium">
        <div className="flex items-center bg-[#f28b82] px-2 text-rose-950" style={{ width: `${costShare}%` }}>
          Costs {show(costs)}
        </div>
        {!losing && (
          <div className="flex flex-1 items-center justify-end bg-[#22a06b] px-2 text-white">Yours {show(left)}</div>
        )}
      </div>
      {losing && <p className="mt-1 text-xs text-amber-800">Costs are {show(-left)} more than what comes in.</p>}
    </div>
  );
}

/** kpi.summary in two easy reads, each a sentence and a split bar: a litre of milk, and a cow. */
function KeyFigures({ r }) {
  const litre = r.per_litre_c;
  const cow = r.per_cow;
  const money = (v) => euros(v, r.currency);
  // biggest costs per litre, as the engine publishes them (no "other" sum on the platform)
  const biggest = Object.entries(litre.cost_lines ?? {})
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon="🥛" title="A litre of milk" subtitle="What each litre you sell brings in, and where it goes">
        <p className="text-sm text-stone-700">
          For every litre you sell, you get about <strong>{cents(litre.revenue)}</strong>.{" "}
          {litre.operating_surplus >= 0 ? (
            <>
              About <strong>{cents(litre.costs)}</strong> pays the farm’s costs, and <strong>{cents(litre.operating_surplus)}</strong> is yours to keep.
            </>
          ) : (
            <>
              But it costs about <strong>{cents(litre.costs)}</strong> to produce.
            </>
          )}
        </p>
        <SplitBar total={litre.revenue} costs={litre.costs} left={litre.operating_surplus} show={cents} />
        {biggest.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            Biggest costs per litre: {biggest.map(([line, v]) => `${labelForCost(line)} ${cents(v)}`).join(" · ")}
          </p>
        )}
      </Panel>
      <Panel icon="🐄" title="A cow" subtitle={`Your farm’s totals shared out over your ${r.milking_cows} milking cows`}>
        <p className="text-sm text-stone-700">
          So far this year, each cow brought in about <strong>{money(cow.revenue)}</strong>.{" "}
          {cow.operating_surplus >= 0 ? (
            <>
              <strong>{money(cow.costs)}</strong> paid the farm’s costs, and <strong>{money(cow.operating_surplus)}</strong> is yours.
            </>
          ) : (
            <>
              But each cow cost about <strong>{money(cow.costs)}</strong>.
            </>
          )}
        </p>
        <SplitBar total={cow.revenue} costs={cow.costs} left={cow.operating_surplus} show={money} />
        <p className="mt-2 text-xs text-stone-500">
          Each cow gave {litres(cow.milk_litres)} of milk
          {r.debt ? ` · you owe ${money(r.debt.per_cow)} in loans for each cow (${money(r.debt.balance)} in total)` : ""}
        </p>
      </Panel>
    </div>
  );
}

/** Dairy key figures from kpi.summary (actual months only), in plain words. Dairy-specific: shown for enterprise "dairy". */
export default function KpiCard({ response, params, describePath, milkBenchmarks, milkLatest, milkYear }) {
  return (
    <Card
      title="Key figures"
      subtitle={response.status === "ok" ? `What a litre of milk and a cow bring in, ${monthLabel(response.result.from.month)}–${monthLabel(response.result.to.month)}` : null}
      badge={<Badge>kpi.summary</Badge>}
    >
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <KeyFigures r={r} />
        )}
      </EngineGate>
      <MilkQuality benchmarks={milkBenchmarks} latest={milkLatest} year={milkYear} />
    </Card>
  );
}
