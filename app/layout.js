import { DM_Sans } from "next/font/google";
import Sidebar from "@/components/shell/Sidebar";
import MobileNav from "@/components/shell/MobileNav";
import Link from "next/link";
import ViewAs from "@/components/shell/ViewAs";
import { getFarm } from "@/lib/financials/farm";
import { readEdits } from "@/lib/farm-edits";
import { OWNER_FARM, chatContext, getViewer } from "@/lib/session";
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
  const edited = farmId ? Object.keys(await readEdits(farmId)).length : 0;
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
            <ViewAs key={`${role}-${farmId}-${tier}`} role={role} tier={tier} owner={getFarm(OWNER_FARM).profile} client={client} />
          </header>
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </div>
        <MobileNav advisor={role === "advisor"} />
      </body>
    </html>
  );
}
