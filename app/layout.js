import { DM_Sans } from "next/font/google";
import Sidebar from "@/components/shell/Sidebar";
import MobileNav from "@/components/shell/MobileNav";
import { getFarm } from "@/lib/financials/farm";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "FarmBiddy",
  description: "FarmBiddy mock platform — farm financials powered by the Financial Engine.",
};

export default function RootLayout({ children }) {
  const { profile } = getFarm();

  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-[#eef1ec] font-[family-name:var(--font-sans)] text-stone-900">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:gap-4 sm:px-6">
            <span className="text-lg font-semibold tracking-tight text-[#173a2b] lg:hidden">FarmBiddy</span>
            {/* Native GET form: Enter opens a new Biddy chat with the question. */}
            <form action="/chat" role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
              <span aria-hidden className="text-emerald-700">✦</span>
              <input
                name="q"
                required
                maxLength={1000}
                className="w-full bg-transparent outline-none placeholder:text-stone-400"
                placeholder="Ask Biddy — “Will I have cash for the December feed bill?”"
                aria-label="Ask Biddy"
              />
            </form>
            <button type="button" aria-label="Notifications" className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                {profile.initials}
              </span>
              <div className="text-sm leading-tight max-sm:hidden">
                <p className="font-medium">{profile.name}</p>
                <p className="text-xs text-stone-500">{profile.farm_name}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
