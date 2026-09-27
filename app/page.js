import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
        FarmBiddy Mock Platform
      </p>
      <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
        Farm financials, calculated elsewhere.
      </h1>
      <p className="mt-4 max-w-lg text-base text-stone-600">
        This prototype collects annual Dairy farm inputs and asks the external
        Financial Engine for the Operating Statement. It does not run financial
        formulas itself.
      </p>
      <div className="mt-8">
        <Link
          href="/farm-financials"
          className="inline-flex rounded bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900"
        >
          Open Farm Financials
        </Link>
      </div>
    </div>
  );
}
