import { labelForCost, labelForInput, labelForRevenue } from "@/lib/financial-engine/mapResult";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

/**
 * Report building blocks. Every figure is a field of the engine's report bundle — nothing is added up here.
 * Printable: plain tables, no client JS.
 */

const eur = (v) => formatCurrency(v);
const pct = (v, d = 1) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: d })}%`);
const num = (v, d = 1, unit = "") => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: d })}${unit}`);
export const period = (p) => `${monthLabel(p.from.month)} ${p.from.year} – ${monthLabel(p.to.month)} ${p.to.year}`;

export function Section({ title, note, children }) {
  return (
    <section className="break-inside-avoid rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 print:rounded-none print:p-0 print:shadow-none print:ring-0">
      <h2 className="text-base font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** rows: [label, value, { strong, indent, raw }] — value is money unless `raw` (already formatted). */
export function Rows({ rows }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <tbody>
        {rows.filter(Boolean).map(([label, value, o = {}], i) => (
          <tr key={i} className={o.strong ? "border-t border-stone-200 font-semibold" : "text-stone-700"}>
            <td className={`py-1 ${o.indent ? "pl-4 text-stone-500" : ""}`}>{label}</td>
            <td className={`py-1 pl-3 text-right whitespace-nowrap ${!o.raw && value < 0 ? "text-red-700" : ""}`}>{o.raw ? value : eur(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const lineRows = (lines, label) =>
  Object.entries(lines)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => [label(k), v, { indent: true }]);

export function Headline({ items }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 sm:grid-cols-4 print:shadow-none">
      {items.map(([label, value, hint]) => (
        <div key={label}>
          <p className="text-xs text-stone-500">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-stone-500">{hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** The report in plain words, before any table: what the farmer would say across the desk. */
function InShort({ children }) {
  return (
    <section className="break-inside-avoid rounded-2xl bg-emerald-50/60 p-5 ring-1 ring-emerald-200 print:rounded-none print:bg-white print:p-0 print:ring-0">
      <h2 className="text-base font-semibold">In short</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-800">{children}</ul>
    </section>
  );
}
const B = ({ children }) => <strong className="font-semibold tabular-nums">{children}</strong>;
const times = (v, d = 1) => `${num(v, d)} times`;
/** €X more / €X less: a change in words, sign as a word. */
const moreLess = (v) => `${eur(Math.abs(v))} ${v < 0 ? "less" : "more"}`;

/** Bank: profit, how well loans are covered, what the farm owns vs owes, and room for a new loan. Engine figures only. */
export function BankInShort({ rep, capacity, minCover }) {
  const p = rep.profit;
  const bs = rep.balance_sheet;
  const loan = capacity?.new_loan;
  return (
    <InShort>
      <li>
        In {period(p)}, the farm took in <B>{eur(p.revenue)}</B> and made <B>{eur(p.net_profit_before_tax)}</B> before tax, a{" "}
        {pct(p.net_margin_pct)} margin.
      </li>
      {rep.kpis.dscr != null && (
        <li>
          What the farm makes covers its loan repayments <B>{times(rep.kpis.dscr)}</B> over
          {minCover ? `; lenders usually want at least ${times(minCover, 2)}` : ""}.
        </li>
      )}
      <li>
        It owes <B>{eur(bs.liabilities.total)}</B> (loans and bills) and has <B>{eur(bs.assets.total)}</B> in land, buildings, stock,
        machinery and cash, so <B>{pct(bs.ratios.equity_pct)}</B> of the farm is its own.
      </li>
      {loan && (
        <li>
          After family drawings and tax, it could repay a new loan of up to about <B>{eur(loan.max_principal)}</B> ({num(loan.annual_rate * 100, 2)}%
          over {num(loan.term_months / 12, 1)} years, about {eur(loan.monthly_payment_at_max)} a month), based on {period(capacity)} including the
          forecast.
        </li>
      )}
    </InShort>
  );
}

/** Advisor: a litre in and out, costs vs the Irish average, this year vs last, and how far the milk price can fall. */
export function AdvisorInShort({ rep, bench }) {
  const k = rep.kpis;
  const l = k.per_litre_c;
  const c = rep.comparison;
  const total = vsAverage(l.costs, bench.total_c);
  // the groups furthest above the average, the ones worth a conversation
  const above = costGroups(k, c, bench)
    .filter((g) => g.avg != null && g.cl - g.avg > g.avg * 0.1)
    .sort((a, b) => b.cl - b.avg - (a.cl - a.avg))
    .slice(0, 2);
  const base = rep.sensitivity.scenarios.find((sc) => sc.name === "base");
  const from = rep.sensitivity.shocks_from ? `${monthLabel(rep.sensitivity.shocks_from.month)}` : null;
  return (
    <InShort>
      <li>
        In {period(k)}, for every litre sold the farm got <B>{num(l.revenue)}c</B> and spent <B>{num(l.costs)}c</B>, leaving{" "}
        <B>{num(l.operating_surplus)}c</B>, or {eur(k.per_cow.operating_surplus)} a cow.
      </li>
      <li>
        Costs are <B>{total.text === "about the same" ? "about the same as" : `${total.text} than`}</B> the average Irish dairy farm ({num(bench.total_c)}c
        a litre)
        {above.length > 0 && `, mostly ${above.map((g) => `${g.label.toLowerCase()}, ${g.cmp.text}`).join(", and ")}`}.
      </li>
      {c && (
        <li>
          Against the same months of {c.comparison.from.year}, the operating surplus is{" "}
          <B>
            {c.profit.net.change < 0 ? "down" : "up"} {eur(Math.abs(c.profit.net.change))}
          </B>
          {c.profit.net.change_pct == null ? "" : ` (${c.profit.net.change_pct > 0 ? "+" : ""}${pct(c.profit.net.change_pct)})`}: milk brought{" "}
          {moreLess(c.milk.volume_effect)} from the litres sold and {moreLess(c.milk.price_effect)} from the price.
        </li>
      )}
      {base && from && (
        <li>
          {base.break_even.surplus_milk_price_c === 0
            ? `Even if milk paid nothing from ${from}, the year would still end in profit.`
            : base.break_even.surplus_milk_price_c != null &&
              `The year stays in profit unless milk falls below ${num(base.break_even.surplus_milk_price_c)}c a litre from ${from}.`}
        </li>
      )}
    </InShort>
  );
}

/** pl.net: operating surplus → net profit before tax. */
export function NetProfit({ p }) {
  return (
    <Section title="Profit" note={`${period(p)} · loan principal is not an expense; only interest is`}>
      <Rows
        rows={[
          ["Income", p.revenue],
          ["Operating Surplus", p.operating_surplus, { strong: true }],
          ["Change in livestock value", p.livestock_value_change, { indent: true }],
          ["Change in stock value", p.stock_value_change, { indent: true }],
          ["Adjusted surplus", p.adjusted_surplus, { strong: true }],
          ["Depreciation", -p.depreciation, { indent: true }],
          ["Earnings before interest (EBIT)", p.ebit, { strong: true }],
          ["Interest", -p.interest, { indent: true }],
          ["Net profit before tax", p.net_profit_before_tax, { strong: true }],
          ["Net margin", pct(p.net_margin_pct), { raw: true }],
        ]}
      />
    </Section>
  );
}

export function BalanceSheet({ bs }) {
  const a = bs.assets;
  const l = bs.liabilities;
  return (
    <Section title={`Balance sheet at ${monthLabel(bs.as_of.month)} ${bs.as_of.year}`} note="Assets at net book value; loans split by when they fall due">
      <div className="grid gap-6 sm:grid-cols-2">
        <Rows
          rows={[
            ["Cash", a.current.cash, { indent: true }],
            ["Debtors", a.current.debtors, { indent: true }],
            ["Stock", a.current.stock, { indent: true }],
            ["Current assets", a.current.total, { strong: true }],
            ["Land", a.non_current.land, { indent: true }],
            ["Buildings", a.non_current.buildings, { indent: true }],
            ["Machinery", a.non_current.machinery, { indent: true }],
            a.non_current.other_fixed_assets ? ["Other fixed assets", a.non_current.other_fixed_assets, { indent: true }] : null,
            ["Livestock", a.non_current.livestock, { indent: true }],
            ["Non-current assets", a.non_current.total, { strong: true }],
            ["Total assets", a.total, { strong: true }],
          ]}
        />
        <Rows
          rows={[
            l.current.overdraft ? ["Overdraft", l.current.overdraft, { indent: true }] : null,
            ["Creditors", l.current.creditors, { indent: true }],
            ["Loans due within 12 months", l.current.loans_due_within_12_months, { indent: true }],
            ["Current liabilities", l.current.total, { strong: true }],
            ["Loans due after 12 months", l.non_current.loans_due_after_12_months, { indent: true }],
            l.non_current.other_long_term_liabilities ? ["Other long-term", l.non_current.other_long_term_liabilities, { indent: true }] : null,
            ["Non-current liabilities", l.non_current.total, { strong: true }],
            ["Total liabilities", l.total, { strong: true }],
            ["Net worth", bs.net_worth, { strong: true }],
            ["Equity", pct(bs.ratios.equity_pct), { raw: true }],
            ["Debt to assets", pct(bs.ratios.debt_to_assets_pct), { raw: true }],
            ["Current ratio", num(bs.ratios.current_ratio, 2, "×"), { raw: true }],
            ["Working capital", bs.ratios.working_capital],
          ]}
        />
      </div>
    </Section>
  );
}

/** loan.schedule with platform names (same order). */
export function Loans({ loans, meta }) {
  if (!loans) return <Section title="Loans">No loans on record.</Section>;
  return (
    <Section title="Loans" note="As at the report date">
      <Rows
        rows={[
          ...loans.loans.map((l, i) => [
            `${meta[i]?.name ?? `Loan ${i + 1}`} · ${meta[i]?.lender ?? ""} · ${num(l.annual_rate * 100, 2, "%")} · ${l.remaining_months} months left`,
            l.balance,
          ]),
          ["Total owed", loans.total_balance, { strong: true }],
          ["Monthly repayments", loans.total_monthly_payment],
          ["Interest still to pay", loans.total_interest],
        ]}
      />
    </Section>
  );
}

/** debt.capacity: what the household can repay and the largest new loan. */
export function Capacity({ c }) {
  return (
    <Section title="Repayment capacity" note={`${period(c)} (actual + forecast) · after household drawings and tax for the year`}>
      <Rows
        rows={[
          ["Operating Surplus", c.operating_surplus],
          c.off_farm_income ? ["Off-farm income", c.off_farm_income, { indent: true }] : null,
          ["Household drawings", -c.drawings, { indent: true }],
          ["Tax", -c.tax, { indent: true }],
          ["Repayment capacity", c.repayment_capacity, { strong: true }],
          ["Current loan repayments", c.debt_service],
          ["Cover after drawings & tax", num(c.repayment_cover, 2, "×"), { raw: true }],
          c.new_loan && [
            `Largest new loan (${num(c.new_loan.annual_rate * 100, 2, "%")}, ${c.new_loan.term_months} months, cover ${num(c.min_cover, 2, "×")})`,
            c.new_loan.max_principal,
            { strong: true },
          ],
          c.new_loan && ["Its monthly payment", c.new_loan.monthly_payment_at_max, { indent: true }],
        ]}
      />
    </Section>
  );
}

/** kpi.summary as a compact grid. */
export function Kpis({ k }) {
  const items = [
    ["Cost of production", num(k.per_litre_c.costs, 1, "c/L")],
    ["Income per litre", num(k.per_litre_c.revenue, 1, "c/L")],
    ["Gross margin", num(k.per_litre_c.gross_margin, 1, "c/L")],
    ["Surplus per litre", num(k.per_litre_c.operating_surplus, 1, "c/L")],
    ["Surplus per cow", eur(k.per_cow.operating_surplus)],
    ["Milk per cow", num(k.per_cow.milk_litres, 0, " L")],
    ["Debt per cow", k.debt ? eur(k.debt.per_cow) : "—"],
    ["Loan cover (to date)", num(k.dscr, 2, "×")],
  ];
  if (k.per_hectare) items.push(["Surplus per hectare", eur(k.per_hectare.operating_surplus)]);
  return (
    <Section title="Key figures" note={`${period(k)} · ${k.milking_cows} cows`}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-stone-500">{label}</p>
            <p className="font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const vsAverage = (cl, avg) => {
  if (avg == null) return null;
  const diff = cl - avg;
  // ponytail: ±10% of the average counts as "about the same"; engine compare (like milk.quality) if this needs to be exact
  if (Math.abs(diff) <= avg * 0.1) return { text: "about the same", tone: "text-stone-500", bar: "bg-stone-400" };
  return diff > 0
    ? { text: `${diff.toFixed(1)}c higher`, tone: "text-amber-700", bar: "bg-amber-500" }
    : { text: `${(-diff).toFixed(1)}c lower`, tone: "text-emerald-700", bar: "bg-emerald-600" };
};

/**
 * Costs per litre next to the Irish average, the €PM way. Lines are grouped as the Teagasc NFS reports them
 * (`bench.groups` names our cost lines per group); the group figures are sums of the engine's per-line c/L and €.
 * € comes from pl.compare (same period); without a prior year there is no compare, so the € column is left out.
 */
/** The farm's cost lines in the NFS groups, biggest c/L first: { label, keys, cl, eur, avg, cmp }. */
export function costGroups(k, c, bench) {
  const perLine = k.per_litre_c.cost_lines;
  const euro = (key) => c?.costs.lines[key]?.actual ?? 0;
  const mapped = new Set(bench.groups.flatMap((g) => g.lines));
  const unmapped = Object.keys(perLine).filter((key) => perLine[key] && !mapped.has(key));
  return [
    ...bench.groups.map((g) => ({ label: g.label, keys: g.lines, avg: g.average_c })),
    ...unmapped.map((key) => ({ label: labelForCost(key), keys: [key], avg: null })),
  ]
    .map((g) => {
      const keys = g.keys.filter((key) => perLine[key]);
      const cl = keys.reduce((s, key) => s + perLine[key], 0);
      return { ...g, keys, cl, eur: keys.reduce((s, key) => s + euro(key), 0), cmp: vsAverage(cl, g.avg) };
    })
    .filter((g) => g.cl || g.avg != null)
    .sort((a, b) => b.cl - a.cl);
}

export function CostBreakdown({ k, c, bench }) {
  const perLine = k.per_litre_c.cost_lines;
  const euro = (key) => c?.costs.lines[key]?.actual ?? 0;
  const groups = costGroups(k, c, bench);
  const max = Math.max(...groups.map((g) => Math.max(g.cl, g.avg ?? 0)));
  const total = vsAverage(k.per_litre_c.costs, bench.total_c);
  const cells = (cl, eurValue, avg, cmp, strong) => (
    <>
      {c && <td className="py-1 text-right">{eur(eurValue)}</td>}
      <td className="py-1 text-right">{cl.toFixed(1)}</td>
      <td className="py-1 text-right text-stone-500">{avg == null ? "—" : avg.toFixed(1)}</td>
      <td className={`py-1 pl-3 text-right whitespace-nowrap ${cmp?.tone ?? ""} ${strong ? "" : "font-medium"}`}>{cmp?.text ?? ""}</td>
    </>
  );
  return (
    <Section
      title="Where the costs go"
      note={`${period(k)} · cent per litre of milk sold, next to the average Irish dairy farm (${bench.year})`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm tabular-nums">
          <thead className="text-left text-xs text-stone-500">
            <tr>
              <th className="py-1 font-medium">Cost</th>
              {c && <th className="py-1 text-right font-medium">€ total</th>}
              <th className="py-1 pl-3 text-right font-medium">Your c/L</th>
              <th className="py-1 pl-3 text-right font-medium">Irish avg</th>
              <th className="py-1 pl-3 text-right font-medium">You vs average</th>
              <th className="w-1/4 py-1 pl-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const { cmp } = g;
              return [
                <tr key={g.label} className="border-t border-stone-100 text-stone-800">
                  <td className="py-1 font-medium">{g.label}</td>
                  {cells(g.cl, g.eur, g.avg, cmp)}
                  <td className="py-1 pl-4">
                    <div className="relative h-2">
                      <div className={`h-2 rounded-full ${cmp?.bar ?? "bg-stone-400"}`} style={{ width: `${(g.cl / max) * 100}%` }} />
                      {g.avg != null && (
                        <div className="absolute -top-1 h-4 w-0.5 bg-stone-800" style={{ left: `${(g.avg / max) * 100}%` }} title={`Irish average ${g.avg.toFixed(1)}c`} />
                      )}
                    </div>
                  </td>
                </tr>,
                ...(g.keys.length > 1
                  ? g.keys.map((key) => (
                      <tr key={key} className="text-xs text-stone-500">
                        <td className="py-0.5 pl-4">{labelForCost(key)}</td>
                        {c && <td className="py-0.5 text-right">{eur(euro(key))}</td>}
                        <td className="py-0.5 text-right">{perLine[key].toFixed(1)}</td>
                        <td colSpan={3} />
                      </tr>
                    ))
                  : []),
              ];
            })}
            <tr className="border-t border-stone-300 font-semibold">
              <td className="py-1">Total costs</td>
              {cells(k.per_litre_c.costs, c?.costs.total.actual, bench.total_c, total, true)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        The black mark on each bar is the Irish average. Within 10% of it counts as about the same. Average: {bench.source}. Its total
        leaves out depreciation, as ours does. It counts paid labour only: the survey doesn’t cost family labour, so a farm that pays
        its labour will look higher.
      </p>
    </Section>
  );
}

/** Bank cash: actual period and the projection rolled on from its close. */
export function Cash({ cash }) {
  const { actual: a, projection: p } = cash;
  return (
    <Section title="Cash">
      <Rows
        rows={[
          ["Bank balance at start", a.opening_cash],
          ["Cash in", a.cash_in, { indent: true }],
          ["Cash out", -a.cash_out, { indent: true }],
          ["Bank balance at report date", a.closing_cash, { strong: true }],
          p && ["Projected cash in", p.cash_in, { indent: true }],
          p && ["Projected cash out", -p.cash_out, { indent: true }],
          p && [`Projected balance at ${monthLabel(p.months.at(-1).period.month)} ${p.months.at(-1).period.year}`, p.closing_cash, { strong: true }],
        ]}
      />
    </Section>
  );
}

/** pl.compare vs the same months last year. */
export function Comparison({ c }) {
  const row = (label, leaf, upIsGood = true) => {
    const good = leaf.change === 0 ? null : leaf.change > 0 === upIsGood;
    return (
      <tr key={label} className="text-stone-700">
        <td className="py-1">{label}</td>
        <td className="py-1 text-right">{eur(leaf.comparison)}</td>
        <td className="py-1 text-right">{eur(leaf.actual)}</td>
        <td className={`py-1 text-right ${good == null ? "" : good ? "text-emerald-700" : "text-red-700"}`}>
          {leaf.change > 0 ? "+" : ""}
          {eur(leaf.change)} {leaf.change_pct == null ? "" : `(${leaf.change_pct > 0 ? "+" : ""}${pct(leaf.change_pct)})`}
        </td>
      </tr>
    );
  };
  return (
    <Section title="This year vs last year" note={`${period({ from: c.actual.from, to: c.actual.to })} vs same months ${c.comparison.from.year}`}>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-xs text-stone-500">
          <tr>
            <th className="py-1 font-medium" />
            <th className="py-1 text-right font-medium">{c.comparison.from.year}</th>
            <th className="py-1 text-right font-medium">{c.actual.from.year}</th>
            <th className="py-1 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {Object.entries(c.revenue)
            .filter(([k]) => k !== "total")
            .map(([k, leaf]) => row(labelForRevenue(k), leaf))}
          {row("Income", c.revenue.total)}
          {row("Operating costs", c.costs.total, false)}
          {row("Operating Surplus", c.profit.net)}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-stone-500">
        Margin {pct(c.margin_pct.comparison)} → {pct(c.margin_pct.actual)} ({c.margin_pct.change_pp > 0 ? "+" : ""}
        {num(c.margin_pct.change_pp, 2)} pts). Milk: {eur(c.milk.volume_effect)} from volume ({num(c.milk.litres.change_pct)}% litres),{" "}
        {eur(c.milk.price_effect)} from price ({num(c.milk.price_c.change, 2)}c/L).
      </p>
    </Section>
  );
}

/** Engine floors break-even at 0 (covered even at a zero price); null = milk price doesn't move it. */
const breakEven = (c) => (c == null ? "—" : c === 0 ? "any price" : num(c, 1, "c"));

/** risk.sensitivity scenarios. */
export function Sensitivity({ s }) {
  const from = s.shocks_from ? `${monthLabel(s.shocks_from.month)} ${s.shocks_from.year}` : null;
  return (
    <Section title="Sensitivity" note={from ? `Shocks from ${from}; earlier months are actual` : "Shocks on every month of the period"}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm tabular-nums">
          <thead className="text-left text-xs text-stone-500">
            <tr>
              <th className="py-1 font-medium">Scenario</th>
              <th className="py-1 text-right font-medium">Surplus</th>
              <th className="py-1 text-right font-medium">Closing cash</th>
              <th className="py-1 text-right font-medium">Lowest cash</th>
              <th className="py-1 text-right font-medium">Loan cover, full year</th>
              <th className="py-1 text-right font-medium">Lowest milk price before a loss / overdraft</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {s.scenarios.map((sc) => (
              <tr key={sc.name}>
                <td className="py-1">{sc.name === "base" ? "As forecast" : sc.name}</td>
                <td className="py-1 text-right">{eur(sc.operating_surplus)}</td>
                <td className="py-1 text-right">{eur(sc.closing_cash)}</td>
                <td className={`py-1 text-right ${sc.lowest_cash.amount < 0 ? "text-red-700" : ""}`}>
                  {eur(sc.lowest_cash.amount)} {monthLabel(sc.lowest_cash.period.month)}
                </td>
                <td className="py-1 text-right">{num(sc.dscr, 2, "×")}</td>
                <td className="py-1 text-right">
                  {breakEven(sc.break_even.surplus_milk_price_c)} / {breakEven(sc.break_even.cash_milk_price_c)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Average milk price used: {num(s.milk_price_c, 1, "c/L")}. The lowest price applies to the months still to come
        {from ? ` (from ${from})` : ""}; “any price” means the farm stays covered even if milk paid nothing.
      </p>
    </Section>
  );
}

/** Accountant P&L by line (pl.compare-free statement tree from report.accountant). */
export function ProfitAndLoss({ pl, p }) {
  return (
    <Section title="Profit and loss" note={period(p)}>
      <Rows
        rows={[
          ...lineRows(Object.fromEntries(Object.entries(pl.revenue).filter(([k]) => k !== "total")), labelForRevenue),
          ["Income", pl.revenue.total, { strong: true }],
          ...lineRows(pl.costs.lines, labelForCost).map(([l, v, o]) => [l, -v, o]),
          ["Operating costs", -pl.costs.total, { strong: true }],
          ["Operating Surplus", pl.profit.net, { strong: true }],
          ["Margin", pct(pl.margin_pct), { raw: true }],
          ["Loan repayments (not an expense)", pl.finance.loan_repayments],
        ]}
      />
    </Section>
  );
}

/** assets.schedule: fixed asset note per asset (names from the platform register, same order). */
export function FixedAssets({ fa, meta }) {
  if (!fa) return <Section title="Fixed assets">No buildings or machinery on record.</Section>;
  const cols = ["opening_nbv", "additions", "depreciation", "closing_nbv"];
  const line = (label, n, strong) => (
    <tr key={label} className={strong ? "border-t border-stone-200 font-semibold" : "text-stone-700"}>
      <td className="py-1">{label}</td>
      {cols.map((c) => (
        <td key={c} className="py-1 text-right">
          {eur(n[c])}
        </td>
      ))}
    </tr>
  );
  return (
    <Section title="Fixed assets" note={`${period(fa)} · land is not depreciated`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm tabular-nums">
          <thead className="text-left text-xs text-stone-500">
            <tr>
              <th className="py-1 font-medium">Asset</th>
              <th className="py-1 text-right font-medium">Opening</th>
              <th className="py-1 text-right font-medium">Additions</th>
              <th className="py-1 text-right font-medium">Depreciation</th>
              <th className="py-1 text-right font-medium">Closing</th>
            </tr>
          </thead>
          <tbody>
            {fa.assets.map((n, i) => line(meta[i]?.name ?? `Asset ${i + 1}`, n))}
            {line("Total", fa.total, true)}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** Accountant cash flow by activity and line, opening → closing. */
export function CashFlow({ cf, p }) {
  const activity = (name, a) => [
    ...lineRows(a.inflows.lines, labelForInput),
    ...lineRows(a.outflows.lines, labelForInput).map(([l, v, o]) => [l, -v, o]),
    [`Net ${name}`, a.net, { strong: true }],
  ];
  return (
    <Section title="Cash flow" note={period(p)}>
      <Rows
        rows={[
          ["Bank balance at start", cf.opening_cash, { strong: true }],
          ...activity("operating", cf.operating),
          ...activity("investing", cf.investing),
          ...activity("financing", cf.financing),
          ["Net cash flow", cf.net_cash_flow, { strong: true }],
          ["Bank balance at end", cf.closing_cash, { strong: true }],
        ]}
      />
    </Section>
  );
}
