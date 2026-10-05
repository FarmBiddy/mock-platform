"use client";

import { useState } from "react";
import { Bar, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { COLORS } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";
import { compact, hatch, todayLine } from "./chartBits";

const GAIN = "#2f7d4f";
const LOSS = "#c2410c";

const VIEWS = [
  ["surplus", "Surplus"],
  ["detail", "Income & costs"],
];

/**
 * Monthly Operating Surplus (default) or Income / Operating costs bars + Surplus line.
 * @param {{ data: { label: string, income: number, costs: number, surplus: number, projected: boolean }[] }} props
 */
export default function MonthlyChart({ data }) {
  const [view, setView] = useState("surplus");
  const firstProjected = data.find((d) => d.projected)?.label;
  const fill = (d, color, id) => (d.projected ? `url(#${id})` : color);

  return (
    <div>
      <div role="tablist" aria-label="Chart view" className="mb-3 inline-flex rounded-lg bg-stone-100 p-0.5 text-xs">
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

      <div className="h-80">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={2}>
            {hatch("hatch-income", COLORS.income)}
            {hatch("hatch-costs", COLORS.costs)}
            {hatch("hatch-gain", GAIN)}
            {hatch("hatch-loss", LOSS)}
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fontSize: 12, fill: "#78716c" }} />
            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
            <ReferenceLine y={0} stroke="#a8a29e" />
            {todayLine(firstProjected)}
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload.projected ? " · projected" : ""}`}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />

            {view === "surplus" ? (
              <Bar dataKey="surplus" name="Operating Surplus" radius={4} maxBarSize={28}>
                {data.map((d) => {
                  const loss = d.surplus < 0;
                  return <Cell key={d.label} fill={fill(d, loss ? LOSS : GAIN, loss ? "hatch-loss" : "hatch-gain")} />;
                })}
              </Bar>
            ) : (
              [
                <Legend key="legend" iconType="circle" wrapperStyle={{ fontSize: 12 }} />,
                <Bar key="income" dataKey="income" name="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={18}>
                  {data.map((d) => <Cell key={d.label} fill={fill(d, COLORS.income, "hatch-income")} />)}
                </Bar>,
                <Bar key="costs" dataKey="costs" name="Operating costs" fill={COLORS.costs} radius={[4, 4, 0, 0]} maxBarSize={18}>
                  {data.map((d) => <Cell key={d.label} fill={fill(d, COLORS.costs, "hatch-costs")} />)}
                </Bar>,
                <Line key="surplus" dataKey="surplus" name="Operating Surplus" stroke={COLORS.surplus} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />,
              ]
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
