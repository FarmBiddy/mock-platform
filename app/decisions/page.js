import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { Stat } from "@/components/financials/PlatformCards";
import { investmentAppraisal, partialBudget } from "@/lib/financial-engine/client";
import { loadFarm } from "@/lib/farm-edits";
import { formatCurrency } from "@/lib/format/currency";
import ProLock from "@/components/ProLock";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Decisions · FarmBiddy" };

const one = (v) => (Array.isArray(v) ? v[0] : v);
/** A number from the URL within [min, max], else null (URL input is untrusted). */
const num = (v, min, max) => {
  const n = Number(one(v));
  return one(v) != null && one(v) !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const fmt = (v, d = 1) => (v == null ? "—" : v.toLocaleString("en-IE", { maximumFractionDigits: d }));
const years = (v) => (v == null ? "never" : `${fmt(v)} years`);

/** Partial-budget lists (engine names) and how the form calls them. */
const KINDS = {
  added_income: "Extra income",
  reduced_costs: "Cost saved",
  added_costs: "Extra cost",
  reduced_income: "Income lost",
};
const ROWS = 6;
/** Planned-investment effects (`annual_effects`, ± EUR a year on a P&L line) → partial-budget rows. */
const effectRows = (inv) =>
  Object.entries(inv?.annual_effects ?? {}).map(([line, amount]) => ({
    kind: amount < 0 ? "reduced_costs" : "added_costs",
    label: line.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()),
    amount: Math.abs(amount), // sign → list (presentation of the planned effect), not maths on results
  }));

/**
 * Advisor decision tools for the open client: a partial budget ("is a typical year better?") and an
 * investment appraisal ("is it a good use of capital over its life?"). Starts from one of the client's
 * planned investments; every field is editable through the URL (GET form). The appraisal's yearly
 * benefit is the partial budget's operating change, straight from the engine.
 */
export default async function DecisionsPage({ searchParams }) {
  const sp = await searchParams;
  const { role, pro } = await getViewer();
  // The owner (Pro) gets a simple version: no rate fields (their new-loan rate is used), plain answers,
  // and "Share with my advisor", who opens the same appraisal with every field.
  const simple = role === "owner";
  const farm = await loadFarm();
  const first = farm.profile.name.split(" ")[0];

  const planned = farm.plan_investments ?? [];
  const inv = planned.find((i) => i.id === one(sp.inv)) ?? planned[0] ?? null;
  const edited = one(sp.go) === "1"; // the form was submitted: use its fields, not the planned investment
  const defaults = {
    title: inv?.name ?? "A change on the farm",
    amount: inv?.amount ?? 0,
    life: inv?.life_months ? inv.life_months / 12 : 10,
    capRate: ((inv?.loan?.annual_rate ?? farm.new_loan_terms?.annual_rate ?? 0.05) * 100),
    discount: ((farm.new_loan_terms?.annual_rate ?? 0.05) * 100),
    residual: 0,
    rows: effectRows(inv),
  };
  const form = edited
    ? {
        title: String(one(sp.title) ?? "").slice(0, 80) || defaults.title,
        amount: num(sp.amount, 0, 10_000_000) ?? 0,
        life: num(sp.life, 1, 40) ?? defaults.life,
        capRate: num(sp.cap_rate, 0, 30) ?? defaults.capRate,
        discount: num(sp.discount, 0, 30) ?? defaults.discount,
        residual: num(sp.residual, 0, 10_000_000) ?? 0,
        rows: Array.from({ length: ROWS }, (_, i) => ({
          kind: KINDS[one(sp[`k${i}`])] ? one(sp[`k${i}`]) : null,
          label: String(one(sp[`l${i}`]) ?? "").trim().slice(0, 60),
          amount: num(sp[`a${i}`], 0, 10_000_000),
        })).filter((r) => r.kind && r.label && r.amount),
      }
    : defaults;

  const lists = Object.fromEntries(Object.keys(KINDS).map((k) => [k, form.rows.filter((r) => r.kind === k).map(({ label, amount }) => ({ label, amount }))]));
  const empty = !form.rows.length && !(form.amount > 0);
  const budget = empty ? null : await partialBudget({
    ...Object.fromEntries(Object.entries(lists).filter(([, l]) => l.length)),
    ...(form.amount > 0 ? { capital: { amount: form.amount, life_years: form.life, annual_rate: form.capRate / 100 } } : {}),
  });
  const pb = budget?.status === "ok" ? budget.result : null;
  const appraisal =
    pb && form.amount > 0
      ? await investmentAppraisal({
          amount: form.amount,
          discount_rate: form.discount / 100,
          annual_benefit: pb.operating_change,
          life_years: Math.round(form.life),
          ...(form.residual ? { residual_value: form.residual } : {}),
        })
      : null;
  const ia = appraisal?.status === "ok" ? appraisal.result : null;
  const money = (v) => formatCurrency(v, pb?.currency);
  const input = "w-full rounded-lg border border-stone-300 px-3 py-2";

  // The same appraisal as a link (for the advisor), and its engine figures in one line.
  const query = new URLSearchParams([
    ["go", "1"],
    ...(inv ? [["inv", inv.id]] : []),
    ...Object.entries({ title: form.title, amount: form.amount, life: form.life, cap_rate: form.capRate, discount: form.discount, residual: form.residual }),
    ...form.rows.flatMap((r, i) => [[`k${i}`, r.kind], [`l${i}`, r.label], [`a${i}`, r.amount]]),
  ]);
  const href = `/decisions?${query}`.length <= 300 ? `/decisions?${query}` : `/decisions${inv ? `?inv=${inv.id}` : ""}`;
  const share =
    pb &&
    new URLSearchParams({
      title: `Is it worth it? ${form.title}`,
      summary: [
        `Typical year ${pb.net_change >= 0 ? "+" : ""}${money(pb.net_change)} after the capital charge`,
        ia && `NPV ${money(ia.npv)} at ${fmt(form.discount)}%`,
        ia && `pays back in ${years(ia.discounted_payback_years)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      href,
    });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decisions</h1>
        <p className="text-sm text-stone-500">
          {simple
            ? "Thinking about a change? Describe it and see whether a typical year is better, and whether the money is well spent over the years. The numbers are a guide: risk, labour and lifestyle are your call."
            : `${farm.profile.farm_name} · is a change worth it in a typical year, and over its life? The engine’s answer is arithmetic, not advice: risk, labour and lifestyle stay ${first}’s call.`}
        </p>
      </div>

      <ProLock pro={pro} title="Is it worth it?" value="Check a change (more cows, a new shed, renting land) on a typical year and over its life before you commit.">
        <div className="space-y-6">

          {planned.length > 1 && (
            <nav aria-label="Planned investments" className="flex flex-wrap gap-2 text-sm">
              {planned.map((i) => (
                <Link key={i.id} href={`/decisions?inv=${i.id}`} className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-300 hover:bg-stone-50">
                  {i.name}
                </Link>
              ))}
            </nav>
          )}

          {/* key: remount when the starting investment changes so the inputs show its values */}
          <form key={inv?.id ?? "none"} className="space-y-4 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-stone-200/70">
            <input type="hidden" name="go" value="1" />
            {inv && <input type="hidden" name="inv" value={inv.id} />}
            <label className="block">
              The change
              <input name="title" maxLength={80} defaultValue={form.title} className={input} />
            </label>
            <div className={`grid gap-4 ${simple ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
              <label className="block">
                Capital spent <span className="text-xs text-stone-400">€, 0 = none</span>
                <input name="amount" type="number" min="0" step="100" defaultValue={form.amount} className={input} />
              </label>
              <label className="block">
                Life <span className="text-xs text-stone-400">years</span>
                <input name="life" type="number" min="1" max="40" step="1" defaultValue={form.life} className={input} />
              </label>
              {simple ? (
                <>
                  <input type="hidden" name="cap_rate" value={form.capRate} />
                  <input type="hidden" name="discount" value={form.discount} />
                </>
              ) : (
                <>
                  <label className="block">
                    Interest on capital <span className="text-xs text-stone-400">% a year</span>
                    <input name="cap_rate" type="number" min="0" max="30" step="0.1" defaultValue={form.capRate} className={input} />
                  </label>
                  <label className="block">
                    Discount rate <span className="text-xs text-stone-400">% (cost of capital)</span>
                    <input name="discount" type="number" min="0" max="30" step="0.1" defaultValue={form.discount} className={input} />
                  </label>
                </>
              )}
              <label className="block">
                Resale value at the end <span className="text-xs text-stone-400">€</span>
                <input name="residual" type="number" min="0" step="100" defaultValue={form.residual} className={input} />
              </label>
            </div>
            <fieldset>
              <legend className="font-medium">What changes in a typical year</legend>
              <div className="mt-2 space-y-2">
                {Array.from({ length: ROWS }, (_, i) => form.rows[i] ?? {}).map((r, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_9rem]">
                    <select name={`k${i}`} defaultValue={r.kind ?? "added_income"} aria-label={`Row ${i + 1} type`} className={input}>
                      {Object.entries(KINDS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input name={`l${i}`} maxLength={60} defaultValue={r.label ?? ""} placeholder="e.g. Extra milk from 10 more cows" aria-label={`Row ${i + 1} description`} className={input} />
                    <input name={`a${i}`} type="number" min="0" step="100" defaultValue={r.amount ?? ""} placeholder="€ a year" aria-label={`Row ${i + 1} amount, € a year`} className={input} />
                  </div>
                ))}
              </div>
            </fieldset>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900">Work it out</button>
          </form>

          {empty ? (
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">
              Describe the change: what it costs up front and what it adds or saves in a typical year (rent more land, contract-rear heifers, buy in
              feed…). Then “Work it out”.
            </p>
          ) : !pb ? (
            <Card title="Couldn’t work it out">
              <p className="text-sm text-stone-600">{budget.error?.message}</p>
            </Card>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card title="A typical year" subtitle="Partial budget: only what changes is counted" badge={<Badge>decision.partial_budget</Badge>}>
                <p className={`mb-4 rounded-xl px-4 py-2 text-sm font-medium ${pb.worthwhile ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                  {pb.worthwhile ? `Better off by ${money(pb.net_change)} a year` : `Worse off by ${money(Math.abs(pb.net_change))} a year`}
                  {pb.capital ? " after the capital charge" : ""}.
                </p>
                <table className="w-full text-sm tabular-nums">
                  <tbody className="divide-y divide-stone-100">
                    {Object.entries(KINDS).flatMap(([k, label]) =>
                      pb[k].items.map((it) => (
                        <tr key={`${k}:${it.label}`}>
                          <td className="py-1.5">
                            {it.label} <span className="text-xs text-stone-400">{label.toLowerCase()}</span>
                          </td>
                          <td className={`py-1.5 text-right ${k.startsWith("added_c") || k.startsWith("reduced_i") ? "text-red-700" : ""}`}>{money(it.amount)}</td>
                        </tr>
                      )),
                    )}
                    {pb.capital && (
                      <tr>
                        <td className="py-1.5">
                          Capital charge <span className="text-xs text-stone-400">depreciation {money(pb.capital.depreciation)} + interest {money(pb.capital.interest)}</span>
                        </td>
                        <td className="py-1.5 text-right text-red-700">{money(pb.capital.annual_charge)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t border-stone-200 font-semibold">
                    <tr>
                      <td className="py-1.5">Gains − losses</td>
                      <td className={`py-1.5 text-right ${pb.net_change < 0 ? "text-red-700" : ""}`}>{money(pb.net_change)}</td>
                    </tr>
                  </tfoot>
                </table>
                {pb.capital && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Stat label="Simple payback" value={years(pb.capital.simple_payback_years)} />
                    <Stat label="Return on investment" value={pb.capital.return_on_investment_pct == null ? "—" : `${fmt(pb.capital.return_on_investment_pct)}%`} />
                  </div>
                )}
              </Card>

              {ia ? (
                <Card title="Over its life" subtitle={simple ? `${fmt(form.life, 0)} years, against a ${fmt(form.discount)}% bank loan` : `${fmt(form.life, 0)} years at a ${fmt(form.discount)}% discount rate`} badge={<Badge>decision.investment</Badge>}>
                  <p className={`mb-4 rounded-xl px-4 py-2 text-sm font-medium ${ia.worthwhile ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    {simple
                      ? ia.worthwhile
                        ? `Money well spent: over ${fmt(form.life, 0)} years it earns ${money(ia.npv)} more than borrowing it at ${fmt(form.discount)}% would cost.`
                        : `Over ${fmt(form.life, 0)} years it doesn’t earn back what borrowing it at ${fmt(form.discount)}% would cost (${money(ia.npv)}).`
                      : ia.worthwhile
                        ? `Earns more than the ${fmt(form.discount)}% cost of capital: worth ${money(ia.npv)} in today’s money.`
                        : `Doesn’t cover the ${fmt(form.discount)}% cost of capital: ${money(ia.npv)} in today’s money.`}
                  </p>
                  {simple ? (
                      <div className="grid grid-cols-2 gap-4">
                        <Stat label="Pays for itself in" value={years(ia.discounted_payback_years)} hint={`${years(ia.simple_payback_years)} before interest`} />
                        <Stat label="Return a year" value={ia.irr_pct == null ? "—" : `${fmt(ia.irr_pct)}%`} hint={`vs ${fmt(form.discount)}% on a bank loan`} />
                      </div>
                  ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Stat label="Net present value" value={money(ia.npv)} danger={ia.npv < 0} />
                    <Stat label="Internal rate of return" value={ia.irr_pct == null ? "—" : `${fmt(ia.irr_pct)}%`} />
                    <Stat label="Payback, discounted" value={years(ia.discounted_payback_years)} hint={`Simple: ${years(ia.simple_payback_years)}`} />
                    <Stat label="Value per € invested" value={ia.profitability_index == null ? "—" : `€${fmt(ia.profitability_index, 2)}`} />
                  </div>
                  )}
                  {!simple && (
                    <>
                      <p className="mt-4 text-xs text-stone-500">
                        Yearly benefit {money(pb.operating_change)}: the typical-year change before the capital charge; NPV counts the outlay and the cost of capital instead.
                      </p>
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-emerald-800 hover:underline">Year by year</summary>
                        <div className="mt-2 max-h-72 overflow-auto">
                          <table className="w-full tabular-nums">
                            <thead className="text-left text-xs text-stone-500">
                              <tr>
                                <th className="py-1 font-medium">Year</th>
                                <th className="py-1 text-right font-medium">Cash flow</th>
                                <th className="py-1 text-right font-medium">Today’s money</th>
                                <th className="py-1 text-right font-medium">Running total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {ia.years.map((y) => (
                                <tr key={y.year}>
                                  <td className="py-1">{y.year}</td>
                                  <td className="py-1 text-right">{money(y.cash_flow)}</td>
                                  <td className="py-1 text-right">{money(y.present_value)}</td>
                                  <td className={`py-1 text-right ${y.cumulative_present_value < 0 ? "text-red-700" : ""}`}>{money(y.cumulative_present_value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  )}
                </Card>
              ) : (
                form.amount > 0 && (
                  <Card title="Over its life">
                    <p className="text-sm text-stone-600">{appraisal?.error?.message ?? "Couldn’t appraise the investment."}</p>
                  </Card>
                )
              )}
            </div>
          )}

          {simple && share && (
            <Link
              href={`/share?${share}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-5 py-3 text-sm text-sky-900 ring-1 ring-sky-200 hover:bg-sky-100"
            >
              <span>Big decision? Your advisor can check it with you before you commit.</span>
              <span className="shrink-0 font-medium">Share with my advisor →</span>
            </Link>
          )}

          {inv && (
            <Link href={`/plan?inv=${inv.id}`} className="inline-block text-sm font-medium text-emerald-800 hover:underline">
              {simple ? "Can you afford it?" : `Can ${first} afford it?`} See it in the 5-year plan →
            </Link>
          )}
        </div>
      </ProLock>
    </div>
  );
}
