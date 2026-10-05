"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 bg-[#173a2b] px-4 py-6 text-[#dfe9df] max-lg:hidden">
      <Link href="/farm-financials" className="px-2 text-xl font-semibold tracking-tight text-white">
        FarmBiddy
      </Link>

      <div className="space-y-2">
        <button
          type="button"
          className="w-full rounded-xl bg-[#2f6b4a] px-3 py-2 text-left text-sm font-medium text-white hover:bg-[#387a55]"
        >
          + New Chat
        </button>
        <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#8fb39c]">Recent</p>
        <p className="truncate px-2 text-sm text-[#b9cfbf]">Can I afford the new tank?</p>
        <p className="truncate px-2 text-sm text-[#b9cfbf]">Spring cash flow check</p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(([label, href]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3 py-2 text-sm ${
                active ? "bg-white/12 font-semibold text-white" : "hover:bg-white/6 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
