/** Shown while the engine calls run. Same grid as the page so nothing jumps when it lands. */
export default function Loading() {
  const box = "rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70 animate-pulse";

  return (
    <div className="space-y-6 p-6" aria-busy="true" aria-label="Loading farm financials">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Farm Financials</h1>
        <p className="text-sm text-stone-500">Biddy is crunching your numbers…</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${box} h-40`} />
        ))}
      </div>
      <div className={`${box} h-96`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${box} h-72`} />
        <div className={`${box} h-72`} />
      </div>
    </div>
  );
}
