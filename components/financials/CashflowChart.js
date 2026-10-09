"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format/currency";
import { compact, niceTicks, todayLine } from "./chartBits";

/** Soft, friendly colours; "left" is amber (not red) even when a month is below zero. */
const SERIES = [
  ["moneyIn", "Money in", "#22a06b"],
  ["moneyOut", "Money out", "#f28b82"],
  ["left", "Money made", "#f5a524"],
];

/**
 * Cashflow month by month from cf.months: what came in, what went out and what was left.
 * Forecast months (after "Today") are paler.
 * @param {{ data: { label: string, moneyIn: number, moneyOut: number, left: number, projected: boolean }[] }} props
 */
export default function CashflowChart({ data }) {
  const firstProjected = data.find((d) => d.projected)?.label;
  const ticks = niceTicks(data.flatMap((d) => [d.moneyIn, d.moneyOut, d.left]), 4);

  return (
    <>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#efedea" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
            <YAxis ticks={ticks} domain={[ticks[0], ticks.at(-1)]} tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
            <ReferenceLine y={0} stroke="#d6d3d1" />
            {todayLine(firstProjected)}
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div className="rounded-lg bg-white p-2.5 text-xs shadow ring-1 ring-stone-200">
                    <p className="mb-1 font-medium">
                      {d.label}
                      {d.projected ? " · forecast" : ""}
                    </p>
                    <p>Money in {formatCurrency(d.moneyIn)}</p>
                    <p>Money out {formatCurrency(d.moneyOut)}</p>
                    <p className="font-medium">Money made {formatCurrency(d.left)}</p>
                  </div>
                );
              }}
            />
            {SERIES.map(([key, name, color]) => (
              <Bar key={key} dataKey={key} name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={18}>
                {data.map((d) => (
                  <Cell key={d.label} fill={color} fillOpacity={d.projected ? 0.4 : 1} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* own legend: Recharts sorts its legend alphabetically; this keeps in → out → made */}
      <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-stone-600">
        {SERIES.map(([key, name, color]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {name}
          </li>
        ))}
      </ul>
    </>
  );
}
