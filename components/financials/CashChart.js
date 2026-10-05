"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format/currency";
import { compact, hatch, niceTicks, todayLine } from "./chartBits";

const POSITIVE = "#2f7d4f";
const NEGATIVE = "#c2410c";

/**
 * Month-end bank balance (engine `closing_cash`). Below zero = overdraft, in red.
 * @param {{ data: { label: string, closing: number, cashIn: number, cashOut: number, projected: boolean }[] }} props
 */
export default function CashChart({ data }) {
  const firstProjected = data.find((d) => d.projected)?.label;
  const ticks = niceTicks(data.map((d) => d.closing), 4);

  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          {hatch("hatch-pos", POSITIVE)}
          {hatch("hatch-neg", NEGATIVE)}
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
          <YAxis ticks={ticks} domain={[ticks[0], ticks.at(-1)]} tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
          <ReferenceLine y={0} stroke="#a8a29e" />
          {todayLine(firstProjected)}
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              const d = active && payload?.[0]?.payload;
              if (!d) return null;
              return (
                <div className="rounded-lg bg-white p-2 text-xs shadow ring-1 ring-stone-200">
                  <p className="font-medium">{d.label}{d.projected ? " · projected" : ""}</p>
                  <p>Cash in {formatCurrency(d.cashIn)}</p>
                  <p>Cash out {formatCurrency(d.cashOut)}</p>
                  <p className="font-medium">Month-end balance {formatCurrency(d.closing)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="closing" name="Month-end balance" radius={4} maxBarSize={28}>
            {data.map((d) => {
              const neg = d.closing < 0;
              const fill = d.projected ? `url(#hatch-${neg ? "neg" : "pos"})` : neg ? NEGATIVE : POSITIVE;
              return <Cell key={d.label} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
