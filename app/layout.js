import { Source_Serif_4, DM_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "FarmBiddy Mock Platform",
  description:
    "Prototype FarmBiddy UI that collects Dairy farm inputs and displays Financial Engine results.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e8ebe6] font-[family-name:var(--font-sans)] text-stone-900">
        <header className="border-b border-stone-200/80 bg-[#1a3a2a] text-[#f3f0e8]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              FarmBiddy
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/farm-financials"
                className="text-[#d8e5d8] hover:text-white"
              >
                Farm Financials
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white/60 py-4 text-center text-xs text-stone-500">
          Mock platform · calculations via external Financial Engine · no local
          financial maths
        </footer>
      </body>
    </html>
  );
}
