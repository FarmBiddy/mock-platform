"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format/currency";

const compact = (v) => `€${Math.round(v / 1000)}k`;

/**
 * Month-end bank balance (engine `closing_cash`). Below zero = overdraft, in red.
 * @param {{ data: { label: string, closing: number, cashIn: number, cashOut: number, projected: boolean }[] }} props
 */
export default function CashChart({ data }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#78716c" }} width={48} />
          <ReferenceLine y={0} stroke="#a8a29e" />
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
            {data.map((d) => (
              <Cell key={d.label} fill={d.closing < 0 ? "#c2410c" : "#2f7d4f"} fillOpacity={d.projected ? 0.4 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
