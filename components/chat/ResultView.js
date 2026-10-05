"use client";

import CashChart from "@/components/financials/CashChart";
import MonthlyChart from "@/components/financials/MonthlyChart";
import { LoansCard } from "@/components/financials/PlatformCards";

/** Renders one engine result Biddy returned, with the same components as the Financials page. */
export default function ResultView({ result }) {
  const view = result.view;
  if (!view) return null;

  return (
    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-stone-200">
      {view.kind === "cash_by_month" && <CashChart data={view.data} />}
      {view.kind === "surplus_by_month" && <MonthlyChart data={view.data} />}
      {view.kind === "loans" && <LoansCard response={result.response} loans={view.loans} />}
    </div>
  );
}
