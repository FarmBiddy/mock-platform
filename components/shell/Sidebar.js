"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, PORTFOLIO } from "./nav";
import { useChats } from "@/lib/chats";

export default function Sidebar({ advisor }) {
  const pathname = usePathname();
  const chats = useChats();

  return (
    <aside className="flex w-60 shrink-0 print:hidden flex-col gap-6 bg-[#173a2b] px-4 py-6 text-[#dfe9df] max-lg:hidden">
      <Link href="/dashboard" className="px-2 text-xl font-semibold tracking-tight text-white">
        FarmBiddy
      </Link>

      <div className="space-y-2">
        <Link
          href="/chat"
          className="block w-full rounded-xl bg-[#2f6b4a] px-3 py-2 text-sm font-medium text-white hover:bg-[#387a55]"
        >
          + New Chat
        </Link>
        {chats.length > 0 && (
          <>
            <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#8fb39c]">Recent</p>
            {chats.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/chat?c=${c.id}`} className="block truncate rounded-lg px-2 py-1 text-sm text-[#b9cfbf] hover:bg-white/6 hover:text-white">
                {c.title}
              </Link>
            ))}
          </>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {(advisor ? [PORTFOLIO, ...NAV] : NAV).map(([label, href]) => {
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
