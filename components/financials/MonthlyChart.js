"use client";

import { Bar, Cell, ComposedChart, Legend, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { COLORS } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";

const compact = (v) => `€${Math.round(v / 1000)}k`;

/**
 * Monthly Income / Operating costs bars + Operating Surplus line.
 * @param {{ data: { label: string, income: number, costs: number, surplus: number, projected: boolean }[] }} props
 */
export default function MonthlyChart({ data }) {
  const firstProjected = data.find((d) => d.projected)?.label;

  return (
    <div className="h-80">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fontSize: 12, fill: "#78716c" }} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
          {firstProjected && (
            <ReferenceArea
              x1={firstProjected}
              x2={data.at(-1).label}
              fill="#f5f5f4"
              label={{ value: "Projected", position: "insideTop", fontSize: 11, fill: "#78716c" }}
            />
          )}
          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name]}
            labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload.projected ? " · projected" : ""}`}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((d) => <Cell key={d.label} fillOpacity={d.projected ? 0.4 : 1} />)}
          </Bar>
          <Bar dataKey="costs" name="Operating costs" fill={COLORS.costs} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((d) => <Cell key={d.label} fillOpacity={d.projected ? 0.4 : 1} />)}
          </Bar>
          <Line dataKey="surplus" name="Operating Surplus" stroke={COLORS.surplus} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
