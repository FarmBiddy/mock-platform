import { formatCurrency } from "@/lib/format/currency";

/**
 * "▲ €15,503 (+6.3%) vs Jan–Sep 2025" from a pl.compare leaf {change, change_pct}.
 * `upIsGood` sets the colour (income up = good, costs up = bad); the arrow carries direction without colour.
 */
export default function Change({ leaf, label, upIsGood = true }) {
  if (!leaf) return null;
  const up = leaf.change > 0;
  const flat = leaf.change === 0;
  const good = flat ? null : up === upIsGood;
  const pct = leaf.change_pct == null ? "" : ` (${up ? "+" : ""}${leaf.change_pct.toLocaleString("en-IE", { maximumFractionDigits: 1 })}%)`;

  return (
    <p className={`text-xs ${good == null ? "text-stone-500" : good ? "text-emerald-700" : "text-red-700"}`}>
      <span aria-hidden>{flat ? "■" : up ? "▲" : "▼"}</span> {up ? "+" : ""}
      {formatCurrency(leaf.change)}
      {pct} <span className="text-stone-500">{label}</span>
    </p>
  );
}
