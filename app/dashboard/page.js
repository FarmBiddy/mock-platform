import Link from "next/link";
import StatusTiles, { DSCR_OK } from "@/components/financials/StatusTiles";
import { EventsCard } from "@/components/financials/PlatformCards";
import { Card } from "@/components/ui";
import { getFarm, isProjected, runFarm } from "@/lib/financials/farm";
import { formatCurrency } from "@/lib/format/currency";
import { dayLabel, monthLabel } from "@/lib/format/date";

export const metadata = { title: "Dashboard · FarmBiddy" };

const QUESTIONS = ["Will I have cash for the December feed bill?", "Am I profitable this year?", "How much more could I borrow?"];

/**
 * Things worth a look, from platform records and engine results (comparisons only, no maths).
 * @returns {{ tone: "bad" | "warn", text: string, href: string }[]}
 */
function attention(farm, { plf, pl, kpi, cff, cf, loans }) {
  const items = [];
  for (const s of farm.suppliers?.suppliers ?? []) {
    if (s.overdue) items.push({ tone: "bad", text: `${s.name}: ${formatCurrency(s.balance)} overdue since ${dayLabel(s.due_date)}`, href: "/farm-financials" });
  }
  if (cf.status === "ok") {
    for (const m of cf.result.months.filter((m) => isProjected(farm, m.period.month) && m.closing_cash < 0)) {
      items.push({ tone: "bad", text: `Projected overdraft at the end of ${monthLabel(m.period.month)} (${formatCurrency(m.closing_cash)})`, href: "/farm-financials" });
    }
  }
  const dscr = kpi.status === "ok" ? kpi.result.dscr : null;
  if (dscr != null && dscr < DSCR_OK) {
    items.push({ tone: dscr < 1 ? "bad" : "warn", text: `Loan cover is ${dscr.toLocaleString("en-IE", { maximumFractionDigits: 2 })}× — lenders look for ${DSCR_OK}×`, href: "/farm-financials" });
  }
  if ([loans, pl, kpi, cf].some((r) => r?.status === "needs_input")) {
    items.push({ tone: "warn", text: "Biddy needs a figure from you to finish your numbers", href: "/farm-financials" });
  }
  if ([plf, cff].some((r) => r && r.status !== "ok")) {
    items.push({ tone: "warn", text: "The forecast couldn’t run — showing actual months only", href: "/farm-financials" });
  }
  return items;
}

export default async function DashboardPage() {
  const farm = getFarm();
  const results = await runFarm(farm);
  const items = attention(farm, results);
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {farm.profile.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-stone-500">
          {farm.profile.farm_name} · {today.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <section className="rounded-2xl bg-[#173a2b] p-5 text-white shadow-sm">
        <form action="/chat" className="flex gap-2 rounded-full bg-white p-1.5">
          <input
            name="q"
            required
            maxLength={1000}
            placeholder="Ask Biddy about your farm’s money…"
            aria-label="Ask Biddy"
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-stone-900 outline-none"
          />
          <button className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium hover:bg-emerald-900">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUESTIONS.map((q) => (
            <Link key={q} href={`/chat?q=${encodeURIComponent(q)}`} className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
              {q}
            </Link>
          ))}
        </div>
      </section>

      <StatusTiles pl={results.pl} cf={results.cf} loans={results.loans} kpi={results.kpi} plc={results.plc} farm={farm} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Needs your attention">
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing urgent. ✓</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.map((it) => (
                <li key={it.text}>
                  <Link href={it.href} className="flex items-start gap-2 rounded-lg p-2 hover:bg-stone-50">
                    <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${it.tone === "bad" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      !
                    </span>
                    <span>{it.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <EventsCard data={farm.events} />
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/farm-financials" className="rounded-xl bg-white px-4 py-3 font-medium shadow-sm ring-1 ring-stone-200 hover:bg-stone-50">
          Farm Financials →
        </Link>
        <Link href="/reports" className="rounded-xl bg-white px-4 py-3 font-medium shadow-sm ring-1 ring-stone-200 hover:bg-stone-50">
          Reports for bank, advisor, accountant →
        </Link>
      </div>
    </div>
  );
}
