"use client";

import { useState, useTransition } from "react";
import { runWhatIf } from "@/app/farm-financials/actions";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import Link from "next/link";
import { setTier } from "@/app/session-actions";
import { FREE_SCENARIO_IDS, WHAT_IF_PRESETS, planHref } from "@/lib/financials/whatIf";

const cents = (v) => `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c/L`;
const times = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}×`);

/** "Oct" (or "Oct 2027") for the engine's shocks_from period. */
const fromLabel = (from) => (from ? monthLabel(from.month) : null);

/**
 * Break-even sentences for the base case, straight from the engine (null = not computable).
 * With shocks_from, break-evens only look at the months from that point (ADR-0040).
 */
function BreakEvens({ result, priceSource }) {
  const base = result.scenarios[0];
  const { surplus_milk_price_c: lossBelow, cash_milk_price_c: overdrawnBelow } = base.break_even;
  const price = result.milk_price_c;
  const from = fromLabel(result.shocks_from);
  const span = from ? `from ${from} to December` : "this year";

  return (
    <ul className="space-y-1 text-sm">
      <li>
        Milk is {from ? "forecast" : "averaging"} at <strong>{cents(price)}</strong> {span}
        {priceSource && <span className="text-stone-500"> ({priceSource})</span>}.
      </li>
      {lossBelow != null &&
        (lossBelow > 0 ? (
          <li>
            You’d make a <strong>loss below {cents(lossBelow)}</strong>.
          </li>
        ) : (
          <li>No milk price would put {from ? `${from}–Dec` : "this year"} into a loss.</li>
        ))}
      {overdrawnBelow != null &&
        (overdrawnBelow <= 0 ? (
          <li>No milk price would put you into overdraft {from ? "before the end of the year" : "this year"}.</li>
        ) : overdrawnBelow > price ? (
          <li className="text-amber-900">
            Even at today’s price you go overdrawn (lowest {formatCurrency(base.lowest_cash.amount, result.currency)} in{" "}
            {monthLabel(base.lowest_cash.period.month)}).
          </li>
        ) : (
          <li>
            You’d go <strong>overdrawn below {cents(overdrawnBelow)}</strong>.
          </li>
        ))}
    </ul>
  );
}

/** One plain sentence per stress test the farmer ran, from the engine's scenario result. */
function StressLines({ result, tests }) {
  const ran = tests.map((t) => [t, result.scenarios.find((s) => s.name === t.label)]).filter(([, s]) => s);
  if (!ran.length) return null;
  const money = (v) => formatCurrency(v, result.currency);
  return (
    <ul className="mt-4 space-y-1 text-sm">
      {ran.map(([t, s]) => (
        <li key={t.id} className={s.lowest_cash.amount < 0 ? "text-amber-900" : ""}>
          <strong>{t.label}</strong> ({t.note}):{" "}
          {s.lowest_cash.amount < 0
            ? `you’d be overdrawn for ${s.overdraft_months} month${s.overdraft_months === 1 ? "" : "s"}, lowest ${money(s.lowest_cash.amount)} in ${monthLabel(s.lowest_cash.period.month)}`
            : `cash stays positive, lowest ${money(s.lowest_cash.amount)} in ${monthLabel(s.lowest_cash.period.month)}`}
          ; debt cover {times(s.dscr)}.
        </li>
      ))}
    </ul>
  );
}

/**
 * What-if panel on risk.sensitivity. The farmer ticks presets; the server runs them against the same
 * months as the page. Every figure is the engine's.
 */
/**
 * `priceSource`: where the forecast milk price comes from; `year`: the calendar year the columns cover.
 * `pro`: false → only the Free scenarios can be ticked; the rest show locked (the server enforces it too).
 * `stressTests`: the advisor's stress tests (label, generated note, shock).
 */
export default function WhatIfCard({ initial, priceSource, year, pro = true, stressTests, stressBy = null }) {
  const scenarios = [...WHAT_IF_PRESETS, ...stressTests];
  const [picked, setPicked] = useState([]);
  const [response, setResponse] = useState(initial);
  const [pending, startTransition] = useTransition();
  const from = response.status === "ok" ? fromLabel(response.result.shocks_from) : null;

  const chip = (p, extra = null) => {
    const locked = !pro && !FREE_SCENARIO_IDS.includes(p.id);
    return (
      <button
        key={p.id}
        aria-pressed={picked.includes(p.id)}
        disabled={locked}
        title={locked ? "Pro" : undefined}
        onClick={() => toggle(p.id)}
        className={`rounded-full px-3 py-1.5 text-sm ring-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 disabled:ring-stone-200 ${
          picked.includes(p.id) ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"
        }`}
      >
        {locked && "🔒 "}
        {p.label} {extra}
      </button>
    );
  };

  function toggle(id) {
    const next = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    setPicked(next);
    startTransition(async () => {
      const res = await runWhatIf(next);
      startTransition(() => setResponse(res));
    });
  }

  return (
    <Card
      title="What if…?"
      subtitle={
        response.status === "ok" && response.result.shocks_from
          ? `Changes apply from ${fromLabel(response.result.shocks_from)} (forecast months); earlier months are actual. Surplus, debt cover and 31 Dec cash cover the whole year.`
          : "Stress-test this year: each change is applied to every month of the year."
      }
      badge={<Badge>risk.sensitivity</Badge>}
    >
      {response.status !== "ok" ? (
        <p className="text-sm text-stone-500">Couldn’t run the scenarios: {response.error?.message ?? "missing figures"}.</p>
      ) : (
        <>
          <BreakEvens result={response.result} priceSource={priceSource} />

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Scenarios">
            {WHAT_IF_PRESETS.map((p) => chip(p))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Stress tests">
            <span className="text-xs font-medium text-stone-500">Stress tests{stressBy ? ` from ${stressBy}` : ""}:</span>
            {stressTests.map((p) => chip(p, <span className="text-xs opacity-75">· {p.note}</span>))}
          </div>
          {!pro && (
            <form action={setTier} className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span>🔒 Pro: every scenario, bank-style stress tests and the 5-year plan.</span>
              <button name="tier" value="pro" className="rounded-full bg-emerald-800 px-3 py-1 font-medium text-white hover:bg-emerald-900">
                Try Pro (demo)
              </button>
            </form>
          )}

          <div className={`mt-4 overflow-x-auto transition-opacity ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
            <table className="w-full min-w-[36rem] text-sm tabular-nums">
              <thead className="text-left text-xs text-stone-500">
                <tr>
                  <th className="py-1 font-medium">Scenario</th>
                  <th className="py-1 text-right font-medium">Surplus {year}</th>
                  <th className="py-1 text-right font-medium">Cash 31 Dec</th>
                  <th className="py-1 text-right font-medium">Lowest cash{from ? ` (from ${from})` : ""}</th>
                  <th className="py-1 text-right font-medium">Months overdrawn{from ? ` (from ${from})` : ""}</th>
                  <th className="py-1 text-right font-medium">Debt cover {year}</th>
                  <th className="py-1 font-medium">
                    <span className="sr-only">Five-year plan</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {response.result.scenarios.map((s) => (
                  <tr key={s.name} className={s.name === "base" ? "font-medium" : ""}>
                    <td className="py-1.5">{s.name === "base" ? "As forecast" : s.name}</td>
                    <td className={`py-1.5 text-right ${s.operating_surplus < 0 ? "text-red-700" : ""}`}>{formatCurrency(s.operating_surplus, response.result.currency)}</td>
                    <td className={`py-1.5 text-right ${s.closing_cash < 0 ? "text-red-700" : ""}`}>{formatCurrency(s.closing_cash, response.result.currency)}</td>
                    <td className={`py-1.5 text-right ${s.lowest_cash.amount < 0 ? "text-red-700" : ""}`}>
                      {formatCurrency(s.lowest_cash.amount, response.result.currency)} <span className="text-xs text-stone-500">{monthLabel(s.lowest_cash.period.month)}</span>
                    </td>
                    <td className="py-1.5 text-right">{s.overdraft_months}</td>
                    <td className={`py-1.5 text-right ${s.dscr != null && s.dscr < 1 ? "text-red-700" : ""}`}>{times(s.dscr)}</td>
                    <td className="py-1.5 pl-3 text-right">
                      {scenarios.some((p) => p.label === s.name) && (
                        <Link
                          href={planHref(scenarios.find((p) => p.label === s.name).shock, response.result.milk_price_c)}
                          className="whitespace-nowrap text-xs font-medium text-emerald-800 hover:underline"
                        >
                          If it lasts: 5 years →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StressLines result={response.result} tests={stressTests} />
        </>
      )}
    </Card>
  );
}
