import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { labelForInput } from "@/lib/financial-engine/mapResult";
import { formatCurrency } from "@/lib/format/currency";

const RANKS = { closing_cash: "Cash on 31 Dec", surplus: "Surplus (full year)" };
const SHOWN = 8;

/** "Milk price ±4.8c/L", "Feed ±10%", "Variable rates ±1 pp" from the engine's driver row. */
function driverLabel(d) {
  const amount = Math.abs(d.high_change).toLocaleString("en-IE", { maximumFractionDigits: 1 });
  if (d.driver === "milk_price") return `Milk price ±${amount}c/L`;
  if (d.driver === "milk_volume") return `Milk volume ±${amount}%`;
  if (d.driver === "herd_size") return `Herd size ±${amount}%`;
  if (d.driver === "interest_rate") return `Variable rates ±${amount} pp`;
  return `${labelForInput(d.driver)} ±${amount}%`;
}

/**
 * "What moves this farm most?" from risk.tornado: each driver moved down and up on its own,
 * bars drawn from the engine's low / high outcomes around the base (no maths beyond the bar widths).
 */
export default function TornadoCard({ response, rank }) {
  return (
    <Card
      title="What moves this farm most?"
      subtitle="Each driver moved down and up on its own from the first forecast month, largest effect first."
      badge={<Badge>risk.tornado</Badge>}
    >
      <nav aria-label="Rank by" className="mb-4 flex flex-wrap gap-2 text-sm">
        {Object.entries(RANKS).map(([key, label]) => (
          <Link
            key={key}
            href={`/farm-financials?rank=${key}`}
            scroll={false}
            aria-current={key === rank ? "true" : undefined}
            className={`rounded-full px-3 py-1 ring-1 ${key === rank ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {response.status !== "ok" ? (
        <p className="text-sm text-stone-500">Couldn’t rank the drivers: {response.error?.message ?? "missing figures"}.</p>
      ) : (
        <Bars result={response.result} rank={rank} />
      )}
    </Card>
  );
}

function Bars({ result, rank }) {
  const base = result.base[rank];
  const drivers = result.drivers.slice(0, SHOWN);
  // Bar geometry: position of each outcome around the base, as a share of the widest swing.
  const reach = Math.max(...drivers.flatMap((d) => [Math.abs(d.low[rank] - base), Math.abs(d.high[rank] - base)]), 1);
  const pos = (v) => 50 + ((v - base) / reach) * 50;
  const money = (v) => formatCurrency(v, result.currency);

  return (
    <>
      <p className="mb-3 text-sm text-stone-600">
        {RANKS[rank]} as forecast: <strong>{money(base)}</strong>. Red: the driver moves the wrong way; green: the right way.
      </p>
      <ul className="space-y-2.5 text-sm">
        {drivers.map((d) => {
          const [worse, better] = d.low[rank] <= d.high[rank] ? [d.low[rank], d.high[rank]] : [d.high[rank], d.low[rank]];
          return (
            <li key={d.driver} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[11rem_1fr]">
              <span className="font-medium">{driverLabel(d)}</span>
              <div>
                <div className="relative h-4 rounded bg-stone-100">
                  <span className="absolute inset-y-0 rounded-l bg-red-400" style={{ left: `${Math.min(pos(worse), 50)}%`, width: `${Math.max(50 - pos(worse), 0)}%` }} />
                  <span className="absolute inset-y-0 rounded-r bg-emerald-500" style={{ left: "50%", width: `${Math.max(pos(better) - 50, 0)}%` }} />
                  <span aria-hidden className="absolute inset-y-[-3px] left-1/2 w-px bg-stone-500" />
                </div>
                <p className="mt-0.5 flex justify-between text-xs tabular-nums text-stone-500">
                  <span className={worse < 0 ? "text-red-700" : ""}>{money(worse)}</span>
                  <span>{money(better)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {result.drivers.length > SHOWN && (
        <p className="mt-3 text-xs text-stone-500">{result.drivers.length - SHOWN} smaller drivers not shown.</p>
      )}
    </>
  );
}
