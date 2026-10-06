import { Badge, Card } from "@/components/ui";
import EngineGate from "@/components/financials/EngineGate";
import { formatCurrency } from "@/lib/format/currency";

const times = (v) => (v == null ? "—" : `${v.toLocaleString("en-IE", { maximumFractionDigits: 2 })}×`);
const pct = (rate) => `${(rate * 100).toLocaleString("en-IE", { maximumFractionDigits: 2 })}%`;

/** "How much more could I borrow?" from debt.capacity: after drawings and tax, at the lender's minimum cover. */
export default function BorrowCard({ response, params, describePath }) {
  return (
    <Card title="How much more could I borrow?" subtitle="Based on this year, actual + forecast" badge={<Badge>debt.capacity</Badge>}>
      <EngineGate response={response} params={params} describePath={describePath}>
        {(r) => (
          <div className="text-sm">
            <p className="text-2xl font-semibold tabular-nums">Up to {formatCurrency(r.new_loan.max_principal, r.currency)}</p>
            <p className="mt-1 text-stone-600">
              About {formatCurrency(r.new_loan.monthly_payment_at_max, r.currency)} a month over {r.new_loan.term_months} months at{" "}
              {pct(r.new_loan.annual_rate)}.
            </p>
            <dl className="mt-4 space-y-1 text-xs text-stone-500">
              <div className="flex justify-between gap-3">
                <dt>Repayment capacity (after {formatCurrency(r.drawings, r.currency)} drawings, {formatCurrency(r.tax, r.currency)} tax)</dt>
                <dd className="tabular-nums">{formatCurrency(r.repayment_capacity, r.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Current loan repayments</dt>
                <dd className="tabular-nums">{formatCurrency(r.debt_service, r.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Cover today / lender minimum</dt>
                <dd className="tabular-nums">
                  {times(r.repayment_cover)} / {times(r.min_cover)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </EngineGate>
    </Card>
  );
}
