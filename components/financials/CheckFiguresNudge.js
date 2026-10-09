import Link from "next/link";

/**
 * Shown instead of alarming red figures when the year looks tight (more out than in, or the bank
 * balance expected below zero): first check the figures are complete, then talk to an advisor.
 */
export default function CheckFiguresNudge({ cfc, cf, owner }) {
  const madeSoFar = cfc?.status === "ok" ? cfc.result.net_cash_flow.actual : null;
  const yearEnd = cf?.status === "ok" ? cf.result.closing_cash : null;
  if (!owner || !((madeSoFar != null && madeSoFar < 0) || (yearEnd != null && yearEnd < 0))) return null;

  return (
    <section className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200">
        ?
      </span>
      <div className="space-y-2">
        <p className="font-semibold">Are all your figures in?</p>
        <p>
          The year looks tighter than it might be. Missing invoices, milk statements or bank payments can make things look worse than they are, so it’s
          worth checking first.
        </p>
        <p>If everything is in, a farm financial advisor can help you plan. You can create a report to bring along.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/farm-data" className="rounded-full bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800">
            Check my figures
          </Link>
          <Link href="/reports?r=advisor" className="rounded-full bg-white px-3 py-1.5 font-medium ring-1 ring-amber-300 hover:bg-amber-100">
            Create a report for an advisor
          </Link>
        </div>
      </div>
    </section>
  );
}
