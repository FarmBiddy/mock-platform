import Link from "next/link";
import { redirect } from "next/navigation";
import { shareWithAdvisor } from "./actions";
import { Card } from "@/components/ui";
import { ADVISOR, getViewer } from "@/lib/session";
import { cleanShare } from "@/lib/shared";

const FIRST = ADVISOR.name.split(" ")[0];

export const metadata = { title: "Share with my advisor · FarmBiddy" };

const one = (v) => (Array.isArray(v) ? v[0] : v);

/**
 * "Share with my advisor": the farmer confirms (and can add a note) before a prepared view goes to the advisor.
 * Linked from the Plan and the dashboard, and Biddy can link here too for big decisions
 * (see docs/biddy-contract.md): /share?title=…&summary=…&href=/plan?…
 */
export default async function SharePage({ searchParams }) {
  const sp = await searchParams;
  if ((await getViewer()).role !== "owner") redirect("/portfolio");

  if (one(sp.sent)) {
    return (
      <div className="mx-auto max-w-xl p-4 sm:p-6">
        <Card title={`Sent to ${ADVISOR.name}`}>
          <p className="text-sm text-stone-600">
            {FIRST} will see it at the top of the client list and can open the same numbers you were looking at.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-emerald-800 hover:underline">
            ← Back to the dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const share = cleanShare({ title: one(sp.title), summary: one(sp.summary), href: one(sp.href) });
  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <Card title="Share with my advisor" subtitle={`${ADVISOR.name} · ${ADVISOR.org}`}>
        {!share ? (
          <p className="text-sm text-stone-600">
            Nothing to share from this link. Use “Share with my advisor” on the Plan or the dashboard.
          </p>
        ) : (
          <form action={shareWithAdvisor} className="space-y-4 text-sm">
            <input type="hidden" name="title" value={share.title} />
            <input type="hidden" name="summary" value={share.summary} />
            <input type="hidden" name="href" value={share.href} />
            <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <p className="font-medium">{share.title}</p>
              {share.summary && <p className="mt-1 text-stone-600">{share.summary}</p>}
              <Link href={share.href} className="mt-2 inline-block text-xs text-emerald-800 hover:underline">
                See what {FIRST} will open →
              </Link>
            </div>
            <label className="block">
              A note for {FIRST} <span className="text-xs text-stone-400">optional</span>
              <textarea name="note" maxLength={280} rows={3} placeholder="e.g. Is this the right time to borrow for the parlour?" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <p className="text-xs text-stone-500">{FIRST} already has access to your farm; this points them to the view you prepared.</p>
            <button className="rounded-full bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900">Send to {FIRST}</button>
          </form>
        )}
      </Card>
    </div>
  );
}
