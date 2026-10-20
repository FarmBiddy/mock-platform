import { DM_Sans } from "next/font/google";
import Sidebar from "@/components/shell/Sidebar";
import MobileNav from "@/components/shell/MobileNav";
import Link from "next/link";
import ViewAs from "@/components/shell/ViewAs";
import Nudge from "@/components/shell/Nudge";
import EnglishValidation from "@/components/shell/EnglishValidation";
import { getFarm } from "@/lib/financials/farm";
import { loadFarm, readEdits } from "@/lib/farm-edits";
import { hasRecords } from "@/lib/farm-fields";
import { OWNER_FARM, OWNER_FARMS, chatContext, getViewer } from "@/lib/session";
import { suggestionsFor } from "@/lib/biddy-suggestions";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "FarmBiddy",
  description: "FarmBiddy mock platform — farm financials powered by the Financial Engine.",
};

export default async function RootLayout({ children }) {
  const viewer = await getViewer();
  const { role, farmId, tier } = viewer;
  const edits = farmId ? await readEdits(farmId) : {};
  const edited = Object.keys(edits).length;
  // A farmer who just signed up is pointed to Farm data until the basics are in.
  const farm = role === "owner" && farmId ? await loadFarm(farmId) : null;
  const nudge = !farm?.profile.starter
    ? null
    : !hasRecords(farm)
      ? "Your farm has no figures yet."
      : farm.opening_cash == null
        ? "Add your bank balance to see your cash flow."
        : null;
  const client = role === "advisor" && farmId ? getFarm(farmId).profile : null;

  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-[#eef1ec] font-[family-name:var(--font-sans)] text-stone-900">
        <Sidebar advisor={role === "advisor"} context={chatContext(viewer)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 print:hidden border-b border-stone-200 bg-white px-4 py-3 sm:gap-4 sm:px-6">
            <span className="text-lg font-semibold tracking-tight text-[#173a2b] lg:hidden">FarmBiddy</span>
            {/* Native GET form: Enter opens a new Biddy chat with the question. */}
            <form action="/chat" role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
              <span aria-hidden className="text-emerald-700">✦</span>
              <input
                name="q"
                required
                maxLength={1000}
                className="w-full bg-transparent outline-none placeholder:text-stone-400"
                placeholder={suggestionsFor(viewer)[0] ? `Ask Biddy — “${suggestionsFor(viewer)[0]}”` : "Ask Biddy…"}
                aria-label="Ask Biddy"
              />
            </form>
            {edited > 0 && (
              <Link href="/farm-data" className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200">
                Edited data
              </Link>
            )}
            <ViewAs
              key={`${role}-${farmId}-${tier}`}
              role={role}
              tier={tier}
              owner={getFarm(role === "owner" ? farmId : OWNER_FARM).profile}
              owners={OWNER_FARMS.map((id) => getFarm(id).profile)}
              client={client}
            />
          </header>
          {nudge && <Nudge text={nudge} />}
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </div>
        <MobileNav advisor={role === "advisor"} />
        <EnglishValidation />
      </body>
    </html>
  );
}
