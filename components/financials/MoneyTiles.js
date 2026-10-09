import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

/** Simple line icons (no icon library): arrow in, arrow out, wallet. */
const ICONS = {
  in: <path d="M12 5v14m0 0-6-6m6 6 6-6" />,
  out: <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  left: <path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3V7Zm0 0 12-3v3m1 7h2" />,
};
const TONES = {
  in: "bg-emerald-50 text-emerald-700",
  out: "bg-rose-50 text-rose-600",
  left: "bg-amber-50 text-amber-700",
};

/** A gentle "vs last year" line: never a big red figure, just a soft word on whether it's up or down. */
function Versus({ leaf, goodWhenUp = true, year }) {
  if (!leaf || leaf.change === 0) return null;
  const up = leaf.change > 0;
  const good = up === goodWhenUp;
  return (
    <p className={`mt-1 text-xs ${good ? "text-emerald-700" : "text-amber-700"}`}>
      {up ? "▲" : "▼"} {formatCurrency(Math.abs(leaf.change))} {up ? "more" : "less"} than this time in {year}
    </p>
  );
}

function Tile({ icon, label, value, hint, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-600">{label}</p>
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${TONES[icon]}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[icon]}
          </svg>
        </span>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-stone-900 tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
      {children}
    </div>
  );
}

/**
 * The farm's money in three plain answers, so far this year: what came in, what went out and what was
 * left. From cf.compare (actual months, with last year's same months). Values are never shown in red.
 * (No year-end bank balance here: a forecast balance misleads people new to farm finance.)
 */
export default function MoneyTiles({ cfc, farm }) {
  const asOf = monthLabel(farm.actual_through_month);
  const so = cfc?.status === "ok" ? cfc.result : null;
  const dash = "—";

  return (
    <section aria-label="Your money this year" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <Tile icon="in" label="Money in" value={so ? formatCurrency(so.cash_in.actual) : dash} hint={`Jan–${asOf}: milk, cattle and schemes`}>
        <Versus leaf={so?.cash_in} year={farm.year - 1} />
      </Tile>
      <Tile icon="out" label="Money out" value={so ? formatCurrency(so.cash_out.actual) : dash} hint={`Jan–${asOf}: bills, loans and family drawings`}>
        <Versus leaf={so?.cash_out} goodWhenUp={false} year={farm.year - 1} />
      </Tile>
      <Tile
        icon="left"
        label="Money made so far"
        value={so ? formatCurrency(so.net_cash_flow.actual) : dash}
        hint={so && so.net_cash_flow.actual < 0 ? "More went out than came in so far" : "What’s left after everything that went out"}
        className="col-span-2 sm:col-span-1"
      >
        <Versus leaf={so?.net_cash_flow} year={farm.year - 1} />
      </Tile>
    </section>
  );
}
