import { setTier } from "@/app/session-actions";

/**
 * A Pro feature shown to a Free owner: the real content, blurred and inert, under a lock that says
 * what it's worth. "Try Pro" flips the demo plan so every feature can be tested.
 * ponytail: the blurred content is still in the page; a real paywall renders it only for Pro.
 */
export default function ProLock({ pro, title, value, children }) {
  if (pro) return children;
  return (
    <div className="relative">
      <div inert aria-hidden className="pointer-events-none max-h-[28rem] select-none overflow-hidden opacity-60 blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <form action={setTier} className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg ring-1 ring-stone-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">🔒 Pro</p>
          <h2 className="mt-1 text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">{value}</p>
          <button name="tier" value="pro" className="mt-4 rounded-full bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900">
            Try Pro (demo)
          </button>
        </form>
      </div>
    </div>
  );
}
