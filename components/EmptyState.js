import Link from "next/link";

/**
 * What a page shows before the farm has any figures (a farmer who just signed up). Deliberately plain:
 * the starting point for designing the new-user experience.
 */
export default function EmptyState({ title, what, headline = "Nothing here yet", next = "Add your figures in Farm data to start." }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
        <p className="text-base font-medium">{headline}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">{what} {next}</p>
        <Link href="/farm-data" className="mt-4 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900">
          Add your figures
        </Link>
      </div>
    </div>
  );
}
