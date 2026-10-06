import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { Stat } from "@/components/financials/PlatformCards";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";

/** Engine ratios are null when not computable → "—". */
const cents = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c/L`);
const litres = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-IE")} L`);

/** Dairy key figures from kpi.summary (actual months only). Dairy-specific: shown for enterprise "dairy". */
export default function KpiCard({ response, params, describePath }) {
  return (
    <Card
      title="Key figures"
      subtitle={response.status === "ok" ? `Per litre and per cow, ${monthLabel(response.result.from.month)}–${monthLabel(response.result.to.month)}` : null}
      badge={<Badge>kpi.summary</Badge>}
    >
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Cost of production" value={cents(r.per_litre_c.costs)} hint={`${cents(r.per_litre_c.variable_costs)} variable`} />
              <Stat label="Income per litre" value={cents(r.per_litre_c.revenue)} hint="Milk, schemes and other" />
              <Stat label="Surplus per litre" value={cents(r.per_litre_c.surplus)} danger={r.per_litre_c.surplus < 0} />
              <Stat label="Surplus per cow" value={formatCurrency(r.per_cow.surplus, r.currency)} danger={r.per_cow.surplus < 0} hint={`${r.milking_cows} cows`} />
              <Stat label="Milk per cow" value={litres(r.per_cow.milk_litres)} />
              <Stat label="Debt per cow" value={r.debt ? formatCurrency(r.debt.per_cow, r.currency) : "—"} hint={r.debt ? `${formatCurrency(r.debt.balance, r.currency)} total` : null} />
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Gross margin {cents(r.per_litre_c.gross_margin)} (income minus variable costs) · fixed costs {cents(r.per_litre_c.fixed_costs)}
            </p>
          </>
        )}
      </EngineGate>
    </Card>
  );
}
