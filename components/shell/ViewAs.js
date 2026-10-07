import Link from "next/link";
import { openClient, resetDemo, setTier, viewAs } from "@/app/session-actions";
import ResetDemoButton from "./ResetDemoButton";
import { ADVISOR } from "@/lib/session";

/**
 * Header identity + mock login switch ("View as" owner or advisor). Native <details>, no client JS.
 * For the advisor inside a client's workspace, a chip names the client and leads back to the portfolio.
 * The owner also gets the demo Free / Pro switch; the advisor's B2B plan includes everything.
 */
export default function ViewAs({ role, owner, client, tier }) {
  const me = role === "advisor" ? { initials: ADVISOR.initials, name: ADVISOR.name, sub: ADVISOR.org } : { initials: owner.initials, name: owner.name, sub: owner.farm_name };
  const option = (value, label, sub) => (
    <button name="role" value={value} aria-current={role === value || undefined} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-stone-100 aria-[current]:bg-emerald-50">
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-xs text-stone-500">{sub}</span>
    </button>
  );

  return (
    <>
      {client && (
        <form action={openClient} className="flex shrink-0 items-center gap-1 rounded-full bg-sky-50 py-1 pr-1 pl-3 text-xs text-sky-900 ring-1 ring-sky-200">
          <span className="max-sm:hidden">Client:</span>
          <span className="font-medium">{client.farm_name}</span>
          <button name="farm" value="" className="rounded-full px-2 py-0.5 hover:bg-sky-100" aria-label="Back to portfolio" title="Back to portfolio">
            ✕
          </button>
        </form>
      )}
      <details className="relative shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-0.5 hover:bg-stone-100 [&::-webkit-details-marker]:hidden">
          <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white ${role === "advisor" ? "bg-sky-800" : "bg-emerald-800"}`}>{me.initials}</span>
          <span className="pr-2 text-sm leading-tight max-sm:hidden">
            <span className="block font-medium">
              {me.name}
              {role === "owner" && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tier === "pro" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}>{tier}</span>
              )}
            </span>
            <span className="block text-xs text-stone-500">{me.sub}</span>
          </span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl bg-white p-2 shadow-lg ring-1 ring-stone-200">
          <form action={viewAs}>
            <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">View as (demo)</p>
            {option("owner", `${owner.name} · farm owner`, owner.farm_name)}
            {option("advisor", `${ADVISOR.name} · advisor`, `${ADVISOR.org} · ${ADVISOR.clients.length} clients`)}
          </form>
          {role === "owner" && (
            <form action={setTier} className="mt-1 border-t border-stone-100 px-3 pt-2">
              <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Plan (demo)</p>
              <div className="flex gap-1 rounded-full bg-stone-100 p-0.5 text-xs">
                {["free", "pro"].map((t) => (
                  <button key={t} name="tier" value={t} aria-pressed={tier === t} className="flex-1 rounded-full py-1 capitalize aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:shadow-sm">
                    {t}
                  </button>
                ))}
              </div>
            </form>
          )}
          {role === "advisor" && (
            <Link href="/portfolio" className="mt-1 block border-t border-stone-100 px-3 pt-2 text-xs text-emerald-800 hover:underline">
              Client portfolio →
            </Link>
          )}
          <form action={resetDemo} className="mt-1 border-t border-stone-100 pt-1">
            <ResetDemoButton />
          </form>
        </div>
      </details>
    </>
  );
}
