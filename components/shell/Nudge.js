"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A line under the header pointing a new farmer to Farm data (not shown on Farm data itself). */
export default function Nudge({ text }) {
  if (usePathname() === "/farm-data") return null;
  return (
    <Link href="/farm-data" className="block bg-sky-50 px-4 py-2 text-sm text-sky-950 ring-1 ring-sky-200 hover:bg-sky-100 sm:px-6 print:hidden">
      {text} <span className="font-medium underline">Go to Farm data →</span>
    </Link>
  );
}
