import { Card } from "@/components/ui";
import { labelForCost } from "@/lib/financial-engine/mapResult";
import { formatCurrency } from "@/lib/format/currency";

const fmt = (v, d = 1) => v.toLocaleString("en-IE", { maximumFractionDigits: d });

/**
 * €PM's profit projection: last 12 months, then the year ahead with the milk price change only, then the full plan.
 * Each column is year 1 of a plan.projection run (no changes / price only / the plan), so every figure is the engine's.
 * A cell that moved more than 0.5% from the last 12 months is green when it helps the farm and red when it hurts.
 */
export default function NextYearTable({ base, priceOnly, plan }) {
  const cols = [base, priceOnly, plan].map((y) => y.pl);
  const lines = Object.keys(plan.pl.costs.lines).filter((k) => cols.some((p) => p.costs.lines[k]));
  const rows = [
    ["Milk sold", (p) => `${fmt(p.milk_litres / 1000, 0)}k L`, (p) => p.milk_litres, true],
    ["Milk price", (_, y) => `${fmt(y.kpis.milk_price_c)}c/L`, (_, y) => y.kpis.milk_price_c, true],
    ["Milk income", (p) => formatCurrency(p.revenue.milk), (p) => p.revenue.milk, true],
    ["Schemes and other income", (p) => formatCurrency(p.revenue.schemes + p.revenue.other), (p) => p.revenue.schemes + p.revenue.other, true],
    ...lines.map((k) => [labelForCost(k), (p) => formatCurrency(p.costs.lines[k] ?? 0), (p) => p.costs.lines[k] ?? 0, false, "pl-4"]),
    ["Total costs", (p) => formatCurrency(p.costs.total), (p) => p.costs.total, false, "font-medium"],
    ["Operating surplus", (p) => formatCurrency(p.operating_surplus), (p) => p.operating_surplus, true, "font-semibold"],
  ];
  const years = [base, priceOnly, plan];
  const tone = (value, was, upIsGood) => {
    if (Math.abs(value - was) <= Math.abs(was) * 0.005) return "";
    return value > was === upIsGood ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800";
  };
  return (
    <Card title="Next year vs your last 12 months" subtitle="Start from what happened, change the milk price, then add your cost plan. Green helps, red hurts.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm tabular-nums">
          <thead className="text-left text-xs text-stone-500">
            <tr>
              <th className="py-1 font-medium" />
              <th className="py-1 text-right font-medium">Last 12 months</th>
              <th className="py-1 text-right font-medium">Milk price change only</th>
              <th className="py-1 text-right font-medium">Your plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map(([label, show, value, upIsGood, cls = ""]) => (
              <tr key={label} className={cls.includes("font") ? cls : "text-stone-700"}>
                <td className={`py-1.5 ${cls.includes("pl-") ? `${cls} text-stone-500` : ""}`}>{label}</td>
                {years.map((y, i) => (
                  <td key={i} className={`px-2 py-1.5 text-right ${i ? tone(value(cols[i], y), value(cols[0], base), upIsGood) : ""}`}>
                    {show(cols[i], y)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Last 12 months is the engine’s reading of your actual year with nothing changed. Your plan adds the cost changes, inflation and
        investments set above.
      </p>
    </Card>
  );
}
