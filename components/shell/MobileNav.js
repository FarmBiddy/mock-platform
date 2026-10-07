"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "./nav";

const PRIMARY = ["/portfolio", "/dashboard", "/farm-financials", "/events", "/tasks"];

/** Bottom bar for phones (sidebar is hidden below lg). "More" is a native <details> sheet. */
export default function MobileNav({ advisor }) {
  const pathname = usePathname();
  const nav = navFor(advisor);
  const item = (label, href, extra = "") => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      className={`flex-1 rounded-lg px-1 py-2 text-center text-[11px] leading-tight ${
        pathname === href ? "bg-white/12 font-semibold text-white" : "text-[#cfe0d3]"
      } ${extra}`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex print:hidden gap-1 bg-[#173a2b] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden">
      {nav.filter(([, href]) => PRIMARY.includes(href)).map(([label, href]) => item(label, href))}
      {/* key remounts (closes) the sheet after navigating */}
      <details key={pathname} className="relative flex-1">
        <summary className="cursor-pointer list-none rounded-lg px-1 py-2 text-center text-[11px] text-[#cfe0d3] [&::-webkit-details-marker]:hidden">
          More
        </summary>
        <div className="absolute right-0 bottom-full mb-2 flex w-48 flex-col gap-0.5 rounded-xl bg-[#173a2b] p-2 shadow-lg">
          {nav.filter(([, href]) => !PRIMARY.includes(href)).map(([label, href]) => item(label, href, "text-left text-sm px-3"))}
        </div>
      </details>
    </nav>
  );
}
