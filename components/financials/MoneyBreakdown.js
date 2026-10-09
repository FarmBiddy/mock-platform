import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import { moneyRows } from "@/lib/financials/views";

function Rows({ rows, total, color }) {
  const top = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="space-y-3 text-sm">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3">
            <span>{r.label}</span>
            <span className="tabular-nums font-medium">{formatCurrency(r.amount)}</span>
          </div>
          {/* bar length: share of the biggest line, for reading at a glance */}
          <div className="mt-1 h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full" style={{ width: `${(r.amount / top) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
      <li className="flex justify-between gap-3 border-t border-stone-100 pt-2 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </li>
    </ul>
  );
}

/** "Where your money came from" and "Where your money went", so far this year (cf.compare, actual months). */
export default function MoneyBreakdown({ cfc, farm }) {
  if (cfc?.status !== "ok") return null;
  const r = cfc.result;
  const period = `Jan–${monthLabel(farm.actual_through_month)} ${farm.year}`;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card title="Where your money came from" subtitle={period} badge={<Badge>cf.compare</Badge>}>
        <Rows rows={moneyRows(r, "in")} total={r.cash_in.actual} color="#22a06b" />
      </Card>
      <Card title="Where your money went" subtitle={period} badge={<Badge>cf.compare</Badge>}>
        <Rows rows={moneyRows(r, "out")} total={r.cash_out.actual} color="#f28b82" />
      </Card>
    </div>
  );
}
