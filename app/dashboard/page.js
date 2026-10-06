import Link from "next/link";
import StatusTiles from "@/components/financials/StatusTiles";
import { loadFarm } from "@/lib/farm-edits";
import { EventsCard } from "@/components/financials/PlatformCards";
import { Card } from "@/components/ui";
import { attention } from "@/lib/financials/attention";
import { runFarm } from "@/lib/financials/farm";
import { ADVISOR, getViewer } from "@/lib/session";

export const metadata = { title: "Dashboard · FarmBiddy" };

const QUESTIONS = ["Will I have cash for the December feed bill?", "Am I profitable this year?", "How much more could I borrow?"];

export default async function DashboardPage() {
  const farm = await loadFarm();
  const { role, pro } = await getViewer();
  const results = await runFarm(farm);
  const items = attention(farm, results);
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {(role === "advisor" ? ADVISOR.name : farm.profile.name).split(" ")[0]}
        </h1>
        <p className="text-sm text-stone-500">
          {role === "advisor" && `Client: ${farm.profile.name}, `}
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

      <StatusTiles pl={results.pl} cf={results.cf} loans={results.loans} kpi={results.kpi} plc={pro ? results.plc : null} farm={farm} />

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
          {role === "owner" && items.some((it) => it.tone === "bad") && (
            <Link
              href={`/share?${new URLSearchParams({ title: "Needs attention on my farm", summary: items.slice(0, 2).map((it) => it.text).join(" · "), href: "/farm-financials" })}`}
              className="mt-3 inline-block text-sm font-medium text-sky-800 hover:underline"
            >
              Share with my advisor →
            </Link>
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
