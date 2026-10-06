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
            <td className={`py-1 text-right ${!o.raw && value < 0 ? "text-red-700" : ""}`}>{o.raw ? value : eur(value)}</td>
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
          ["Operating Surplus", c.surplus],
          c.off_farm_income ? ["Off-farm income", c.off_farm_income, { indent: true }] : null,
          ["Household drawings", -c.drawings, { indent: true }],
          ["Tax", -c.tax, { indent: true }],
          ["Repayment capacity", c.repayment_capacity, { strong: true }],
          ["Current loan repayments", c.debt_service],
          ["Repayment cover", num(c.repayment_cover, 2, "×"), { raw: true }],
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
    ["Surplus per litre", num(k.per_litre_c.surplus, 1, "c/L")],
    ["Surplus per cow", eur(k.per_cow.surplus)],
    ["Milk per cow", num(k.per_cow.milk_litres, 0, " L")],
    ["Debt per cow", k.debt ? eur(k.debt.per_cow) : "—"],
    ["Debt service cover", num(k.dscr, 2, "×")],
  ];
  if (k.per_hectare) items.push(["Surplus per hectare", eur(k.per_hectare.surplus)]);
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
              <th className="py-1 text-right font-medium">Debt cover</th>
              <th className="py-1 text-right font-medium">Break-even (loss / overdraft)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {s.scenarios.map((sc) => (
              <tr key={sc.name}>
                <td className="py-1">{sc.name === "base" ? "As forecast" : sc.name}</td>
                <td className="py-1 text-right">{eur(sc.surplus)}</td>
                <td className="py-1 text-right">{eur(sc.closing_cash)}</td>
                <td className={`py-1 text-right ${sc.lowest_cash.amount < 0 ? "text-red-700" : ""}`}>
                  {eur(sc.lowest_cash.amount)} {monthLabel(sc.lowest_cash.period.month)}
                </td>
                <td className="py-1 text-right">{num(sc.dscr, 2, "×")}</td>
                <td className="py-1 text-right">
                  {num(sc.break_even.surplus_milk_price_c, 1, "c")} / {num(sc.break_even.cash_milk_price_c, 1, "c")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">Average milk price used: {num(s.milk_price_c, 1, "c/L")}.</p>
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
