"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "@/components/ui";
import { compact, niceTicks } from "@/components/financials/chartBits";
import { formatCurrency } from "@/lib/format/currency";

const POSITIVE = "#2f7d4f";
const NEGATIVE = "#c2410c";

/** One small bar chart (no dual axes: cash and net worth live on very different scales). */
function YearBars({ title, data, colorOf, ariaLabel }) {
  const ticks = niceTicks(data.map((d) => d.value), 4);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-sm font-medium">{title}</figcaption>
      <div className="h-48" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
            <YAxis ticks={ticks} domain={[ticks[0], ticks.at(-1)]} tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={52} />
            <ReferenceLine y={0} stroke="#a8a29e" />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} formatter={(v) => [formatCurrency(v), title]} labelFormatter={(l, p) => p?.[0]?.payload.period ?? l} />
            <Bar dataKey="value" radius={4} maxBarSize={36}>
              {data.map((d) => (
                <Cell key={d.label} fill={colorOf(d)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Net worth as a line on a tight axis: year-to-year changes are small next to the total. */
function NetWorthLine({ data }) {
  const ticks = niceTicks(data.map((d) => d.value), 4, { zero: false });
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-sm font-medium">Net worth</figcaption>
      <div className="h-48" role="img" aria-label={`Net worth: ${data.map((d) => `${d.label} ${formatCurrency(d.value)}`).join(", ")}`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
            <YAxis ticks={ticks} domain={[ticks[0], ticks.at(-1)]} tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={52} />
            <Tooltip formatter={(v) => [formatCurrency(v), "Net worth"]} labelFormatter={(l, p) => p?.[0]?.payload.period ?? l} />
            <Line dataKey="value" stroke={COLORS.surplus} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/**
 * Year-end cash and net worth from plan.projection years.
 * @param {{ years: { label: string, period: string, cash: number, netWorth: number }[] }} props
 */
export default function PlanCharts({ years }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <YearBars
        title="Cash at year end"
        ariaLabel={`Cash at year end: ${years.map((y) => `${y.label} ${formatCurrency(y.cash)}`).join(", ")}`}
        data={years.map((y) => ({ label: y.label, period: y.period, value: y.cash }))}
        colorOf={(d) => (d.value < 0 ? NEGATIVE : POSITIVE)}
      />
      <NetWorthLine data={years.map((y) => ({ label: y.label, period: y.period, value: y.netWorth }))} />
    </div>
  );
}
