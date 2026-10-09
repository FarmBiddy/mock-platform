import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";
import { labelForCost } from "@/lib/financial-engine/mapResult";
import { monthLabel } from "@/lib/format/date";
import { MILK_METRICS, compareToAverage } from "@/lib/benchmarks-core";

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
    <Panel
      icon="🧪"
      title="Milk quality"
      subtitle={statement ? `From your ${statement.label} milk statement, compared with other Irish herds` : "Compared with other Irish herds"}
      className="mt-4"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
export default function KpiCard({ response, params, describePath, milkBenchmarks, milkStatement }) {
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
      <MilkQuality benchmarks={milkBenchmarks} statement={milkStatement} />
    </Card>
  );
}
