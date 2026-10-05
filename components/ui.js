export const COLORS = { income: "#2f7d4f", costs: "#c27a1f", surplus: "#3b5fc0" };

const BADGES = {
  engine: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  platform: "bg-sky-50 text-sky-800 ring-sky-200",
  soon: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function Badge({ tone = "engine", children }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${BADGES[tone]}`}>{children}</span>
  );
}

export function Card({ title, subtitle, badge, className = "", children }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {badge}
      </header>
      {children}
    </section>
  );
}
