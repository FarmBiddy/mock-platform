"use client";

import { useState } from "react";
import { Bar, Cell, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { COLORS } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";
import { compact, hatch, niceTicks, todayLine } from "./chartBits";
import MonthDetail from "./MonthDetail";

const GAIN = "#2f7d4f";
const LOSS = "#c2410c";

const VIEWS = [
  ["surplus", "Surplus"],
  ["detail", "Income & costs"],
];

/**
 * Monthly Operating Surplus (default) or Income / Operating costs bars + Surplus line.
 * Click a month to see its statement; the last actual month is shown first.
 * @param {{ data: { label: string, income: number, costs: number, surplus: number, projected: boolean, detail: object }[] }} props
 */
export default function MonthlyChart({ data }) {
  const [view, setView] = useState("surplus");
  const [selected, setSelected] = useState(() => data.findLast((d) => !d.projected)?.label ?? data[0]?.label);
  const month = data.find((d) => d.label === selected);
  const pick = (bar) => bar?.payload?.label && setSelected(bar.payload.label);
  const firstProjected = data.find((d) => d.projected)?.label;
  const ticks = niceTicks(data.flatMap((d) => (view === "surplus" ? [d.surplus] : [d.income, d.costs, d.surplus])));
  const fill = (d, color, id) => (d.projected ? `url(#${id})` : color);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Chart view" className="inline-flex rounded-lg bg-stone-100 p-0.5 text-xs">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`rounded-md px-3 py-1 ${view === key ? "bg-white font-medium shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-stone-500">
          Month detail
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-stone-800"
          >
            {data.map((d) => (
              <option key={d.label} value={d.label}>
                {d.label}
                {d.projected ? " (projected)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="h-80">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
            barGap={2}
            onClick={(e) => e?.activeLabel && setSelected(e.activeLabel)}
            className="cursor-pointer"
          >
            {month && <ReferenceArea x1={month.label} x2={month.label} fill="#e7e5e4" fillOpacity={0.6} />}
            {hatch("hatch-income", COLORS.income)}
            {hatch("hatch-costs", COLORS.costs)}
            {hatch("hatch-gain", GAIN)}
            {hatch("hatch-loss", LOSS)}
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fontSize: 12, fill: "#78716c" }} />
            <YAxis ticks={ticks} domain={[ticks[0], ticks.at(-1)]} tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
            <ReferenceLine y={0} stroke="#a8a29e" />
            {todayLine(firstProjected)}
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload.projected ? " · projected" : ""}`}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />

            {view === "surplus" ? (
              <Bar dataKey="surplus" name="Operating Surplus" radius={4} maxBarSize={28} onClick={pick}>
                {data.map((d) => {
                  const loss = d.surplus < 0;
                  return <Cell key={d.label} fill={fill(d, loss ? LOSS : GAIN, loss ? "hatch-loss" : "hatch-gain")} />;
                })}
              </Bar>
            ) : (
              [
                <Legend key="legend" iconType="circle" wrapperStyle={{ fontSize: 12 }} />,
                <Bar key="income" dataKey="income" name="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={18} onClick={pick}>
                  {data.map((d) => <Cell key={d.label} fill={fill(d, COLORS.income, "hatch-income")} />)}
                </Bar>,
                <Bar key="costs" dataKey="costs" name="Operating costs" fill={COLORS.costs} radius={[4, 4, 0, 0]} maxBarSize={18} onClick={pick}>
                  {data.map((d) => <Cell key={d.label} fill={fill(d, COLORS.costs, "hatch-costs")} />)}
                </Bar>,
                <Line key="surplus" dataKey="surplus" name="Operating Surplus" stroke={COLORS.surplus} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />,
              ]
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {month && <MonthDetail month={month} />}
    </div>
  );
}
