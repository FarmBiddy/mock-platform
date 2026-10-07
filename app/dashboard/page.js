import Link from "next/link";
import StatusTiles from "@/components/financials/StatusTiles";
import { loadFarm } from "@/lib/farm-edits";
import { EventsCard } from "@/components/financials/PlatformCards";
import { Card } from "@/components/ui";
import { attention } from "@/lib/financials/attention";
import { runFarm } from "@/lib/financials/farm";
import { ADVISOR, getViewer } from "@/lib/session";
import BiddyBox from "@/components/BiddyBox";
import { suggestionsFor } from "@/lib/biddy-suggestions";
import { NOTE_MAX, readNotes } from "@/lib/notes";
import { saveNote } from "@/app/session-actions";

export const metadata = { title: "Dashboard · FarmBiddy" };

export default async function DashboardPage() {
  const farm = await loadFarm();
  const viewer = await getViewer();
  const { role, pro } = viewer;
  const note = role === "advisor" ? ((await readNotes())[farm.profile.id] ?? "") : null;
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

      <BiddyBox placeholder={role === "advisor" ? `Ask Biddy about ${farm.profile.farm_name}…` : "Ask Biddy about your farm’s money…"} questions={suggestionsFor(viewer)} />

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

      {note != null && (
        <Card title={`Your notes on ${farm.profile.farm_name}`} subtitle={`Only you see these — not ${farm.profile.name.split(" ")[0]}.`}>
          {/* key: remount after saving so the textarea shows the stored note */}
          <form key={note} action={saveNote} className="space-y-2">
            <textarea
              name="note"
              defaultValue={note}
              maxLength={NOTE_MAX}
              rows={4}
              placeholder="e.g. Talk about the parlour loan at the November visit; check the feed contract."
              aria-label="Notes"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-900">Save note</button>
          </form>
        </Card>
      )}

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
