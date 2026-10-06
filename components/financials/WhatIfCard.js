"use client";

import { useState, useTransition } from "react";
import { runWhatIf } from "@/app/farm-financials/actions";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import { WHAT_IF_PRESETS } from "@/lib/financials/whatIf";

const cents = (v) => `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c/L`;
const times = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}×`);

/** "Oct" (or "Oct 2027") for the engine's shocks_from period. */
const fromLabel = (from) => (from ? monthLabel(from.month) : null);

/**
 * Break-even sentences for the base case, straight from the engine (null = not computable).
 * With shocks_from, break-evens only look at the months from that point (ADR-0040).
 */
function BreakEvens({ result }) {
  const base = result.scenarios[0];
  const { surplus_milk_price_c: lossBelow, cash_milk_price_c: overdrawnBelow } = base.break_even;
  const price = result.milk_price_c;
  const from = fromLabel(result.shocks_from);
  const span = from ? `from ${from} to December` : "this year";

  return (
    <ul className="space-y-1 text-sm">
      <li>
        Milk is {from ? "forecast" : "averaging"} at <strong>{cents(price)}</strong> {span}.
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

/**
 * What-if panel on risk.sensitivity. The farmer ticks presets; the server runs them against the same
 * months as the page. Every figure is the engine's.
 */
export default function WhatIfCard({ initial }) {
  const [picked, setPicked] = useState([]);
  const [response, setResponse] = useState(initial);
  const [pending, startTransition] = useTransition();
  const from = response.status === "ok" ? fromLabel(response.result.shocks_from) : null;

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
          <BreakEvens result={response.result} />

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Scenarios">
            {WHAT_IF_PRESETS.map((p) => (
              <button
                key={p.id}
                aria-pressed={picked.includes(p.id)}
                onClick={() => toggle(p.id)}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  picked.includes(p.id) ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={`mt-4 overflow-x-auto transition-opacity ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
            <table className="w-full min-w-[36rem] text-sm tabular-nums">
              <thead className="text-left text-xs text-stone-500">
                <tr>
                  <th className="py-1 font-medium">Scenario</th>
                  <th className="py-1 text-right font-medium">Surplus (full year)</th>
                  <th className="py-1 text-right font-medium">Cash 31 Dec</th>
                  <th className="py-1 text-right font-medium">Lowest cash{from ? ` (from ${from})` : ""}</th>
                  <th className="py-1 text-right font-medium">Months overdrawn{from ? ` (from ${from})` : ""}</th>
                  <th className="py-1 text-right font-medium">Debt cover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {response.result.scenarios.map((s) => (
                  <tr key={s.name} className={s.name === "base" ? "font-medium" : ""}>
                    <td className="py-1.5">{s.name === "base" ? "As forecast" : s.name}</td>
                    <td className={`py-1.5 text-right ${s.surplus < 0 ? "text-red-700" : ""}`}>{formatCurrency(s.surplus, response.result.currency)}</td>
                    <td className={`py-1.5 text-right ${s.closing_cash < 0 ? "text-red-700" : ""}`}>{formatCurrency(s.closing_cash, response.result.currency)}</td>
                    <td className={`py-1.5 text-right ${s.lowest_cash.amount < 0 ? "text-red-700" : ""}`}>
                      {formatCurrency(s.lowest_cash.amount, response.result.currency)} <span className="text-xs text-stone-500">{monthLabel(s.lowest_cash.period.month)}</span>
                    </td>
                    <td className="py-1.5 text-right">{s.overdraft_months}</td>
                    <td className={`py-1.5 text-right ${s.dscr != null && s.dscr < 1 ? "text-red-700" : ""}`}>{times(s.dscr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
