import { redirect } from "next/navigation";
import { openClient } from "@/app/session-actions";
import { dismissShare, openShare } from "@/app/share/actions";
import { DSCR_OK } from "@/components/financials/StatusTiles";
import { Badge, Card } from "@/components/ui";
import { loadFarm } from "@/lib/farm-edits";
import { attention } from "@/lib/financials/attention";
import { isProjected, runFarm } from "@/lib/financials/farm";
import { formatCurrency } from "@/lib/format/currency";
import { monthLabel } from "@/lib/format/date";
import { formatMarginPct } from "@/lib/format/percent";
import { ADVISOR, getViewer } from "@/lib/session";
import { readShares } from "@/lib/shared";
import { readNotes } from "@/lib/notes";

export const metadata = { title: "Portfolio · FarmBiddy" };

const ok = (r) => (r?.status === "ok" ? r.result : null);
const count = (items, tone) => items.filter((i) => i.tone === tone).length;

/** One client's row: engine figures picked as published, flags from the shared attention list. */
async function clientRow(id) {
  const farm = await loadFarm(id);
  const r = await runFarm(farm);
  const ahead = ok(r.cf)?.months.filter((m) => isProjected(farm, m.period.month)) ?? [];
  return {
    farm,
    costPerLitre: ok(r.kpi)?.per_litre_c.costs,
    ytd: ok(r.pl)?.ytd,
    dscr: ok(r.kpi)?.dscr,
    lowest: ahead.length ? ahead.reduce((a, b) => (b.closing_cash < a.closing_cash ? b : a)) : null,
    items: attention(farm, r),
  };
}

/** Riskiest first: more red flags, then more amber, then the lowest projected cash. */
const byRisk = (a, b) =>
  count(b.items, "bad") - count(a.items, "bad") ||
  count(b.items, "warn") - count(a.items, "warn") ||
  (a.lowest?.closing_cash ?? Infinity) - (b.lowest?.closing_cash ?? Infinity);

export default async function PortfolioPage() {
  const { role, farmId } = await getViewer();
  if (role !== "advisor") redirect("/dashboard");
  const rows = (await Promise.all(ADVISOR.clients.map(clientRow))).sort(byRisk);
  const shares = await readShares();
  const notes = await readNotes();
  const farmOf = (id) => rows.find((r) => r.farm.profile.id === id)?.farm.profile;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client portfolio</h1>
        <p className="text-sm text-stone-500">
          {ADVISOR.name} · {ADVISOR.org} · {rows.length} dairy clients, riskiest first
        </p>
      </div>

      {shares.length > 0 && (
        <Card title="Shared by your clients" subtitle="Views a client prepared and sent you, newest first">
          <ul className="divide-y divide-stone-100 text-sm">
            {shares.map((sh) => (
              <li key={sh.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {farmOf(sh.farm)?.farm_name ?? sh.farm} · {sh.title}
                  </p>
                  {sh.summary && <p className="text-stone-600">{sh.summary}</p>}
                  {sh.note && <p className="mt-1 rounded-lg bg-sky-50 px-3 py-1.5 text-sky-900">“{sh.note}” — {farmOf(sh.farm)?.name}</p>}
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(sh.at).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={openShare}>
                    <button name="id" value={sh.id} className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-900">
                      Open
                    </button>
                  </form>
                  <form action={dismissShare}>
                    <button name="id" value={sh.id} className="rounded-full px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
                      Done
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Clients side by side" subtitle="This year’s actuals to date and the engine’s forecast to December" badge={<Badge>kpi.summary · pl.months · cf.months</Badge>}>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 text-right font-medium">Cost of production</th>
                <th className="py-2 pr-4 text-right font-medium">Surplus to date</th>
                <th className="py-2 pr-4 text-right font-medium">Loan cover</th>
                <th className="py-2 pr-4 text-right font-medium">Lowest cash ahead</th>
                <th className="py-2 font-medium">Needs a look</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ farm, costPerLitre, ytd, dscr, lowest, items }) => (
                <tr key={farm.profile.id} className="border-b border-stone-100 align-top last:border-0">
                  <td className="py-3 pr-4">
                    <form action={openClient}>
                      <input type="hidden" name="farm" value={farm.profile.id} />
                      <button className="text-left font-medium text-emerald-800 hover:underline">{farm.profile.farm_name} →</button>
                    </form>
                    <p className="text-xs text-stone-500">
                      {farm.profile.name} · {farm.profile.county} · {farm.milking_cows ?? "?"} cows
                      {farm.profile.id === farmId && " · open"}
                      {farm.editCount > 0 && " · edited"}
                      {shares.some((sh) => sh.farm === farm.profile.id) && <span className="ml-1 rounded-full bg-sky-100 px-1.5 text-sky-800">shared</span>}
                    </p>
                    {notes[farm.profile.id] && <p className="mt-1 line-clamp-2 max-w-56 text-xs text-stone-600">📝 {notes[farm.profile.id]}</p>}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {costPerLitre == null ? "—" : `${costPerLitre.toLocaleString("en-IE", { maximumFractionDigits: 1 })}c/L`}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {ytd ? formatCurrency(ytd.profit.net, ytd.currency) : "—"}
                    {ytd && <p className="text-xs text-stone-500">{formatMarginPct(ytd.profit.margin_pct, 0)} margin</p>}
                  </td>
                  <td className={`py-3 pr-4 text-right tabular-nums ${dscr != null && dscr < DSCR_OK ? (dscr < 1 ? "text-red-700" : "text-amber-700") : ""}`}>
                    {dscr == null ? "—" : `${dscr.toLocaleString("en-IE", { maximumFractionDigits: 2 })}×`}
                  </td>
                  <td className={`py-3 pr-4 text-right tabular-nums ${lowest?.closing_cash < 0 ? "text-red-700" : ""}`}>
                    {lowest ? formatCurrency(lowest.closing_cash) : "—"}
                    {lowest && <p className="text-xs text-stone-500">{monthLabel(lowest.period.month)}</p>}
                  </td>
                  <td className="min-w-64 py-3">
                    {items.length === 0 ? (
                      <span className="text-stone-500">Nothing urgent ✓</span>
                    ) : (
                      <ul className="space-y-1">
                        {items.slice(0, 2).map((it) => (
                          <li key={it.text} className="flex items-start gap-1.5">
                            <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${it.tone === "bad" ? "bg-red-500" : "bg-amber-400"}`} />
                            <span>{it.text}</span>
                          </li>
                        ))}
                        {items.length > 2 && <li className="pl-3.5 text-xs text-stone-500">+{items.length - 2} more</li>}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-stone-500">Portfolio averages and benchmarks need an engine function — until then clients are shown side by side.</p>
      </Card>
    </div>
  );
}
