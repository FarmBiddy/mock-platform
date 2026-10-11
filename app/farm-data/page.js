import Link from "next/link";
import { Card } from "@/components/ui";
import AutoSaveForm from "@/components/AutoSaveForm";
import { loadFarm, ownerOf, readEdits, yearValue } from "@/lib/farm-edits";
import { ADVISOR, getViewer } from "@/lib/session";
import { forecastMilkPrice } from "@/lib/financials/farm";
import { monthLabel } from "@/lib/format/date";
import { autosaveFarmData, resetFarmData } from "./actions";

export const metadata = { title: "Farm data · FarmBiddy" };

const MONTH_FIELDS = [
  ["pl.milk_litres", "Milk supplied", "litres", "1"],
  ["pl.milk_price", "Milk price paid", "€/litre", "0.0001"],
  ["cash.milk", "Milk cheque received", "€", "1"],
  ["lines.feed", "Feed", "€", "1"],
  ["lines.fertiliser", "Fertiliser", "€", "1"],
  ["lines.vet", "Vet", "€", "1"],
  ["lines.contractor", "Contractor", "€", "1"],
  ["lines.labour", "Labour", "€", "1"],
  ["lines.cattle_sales", "Cattle sales", "€", "1"],
];

const pill = (on) =>
  `rounded-full px-3 py-1 text-sm ring-1 ${on ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`;

/** `locked`: why this role can't change the field (the other role owns it); shown instead of the hint. */
function Field({ name, label, unit, step = "1", value, edited, hint, optional, min = "0", locked }) {
  return (
    <label className="block text-sm">
      <span className="flex items-center gap-2 text-stone-700">
        {label} <span className="text-xs text-stone-400">{unit}</span>
        {edited && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">edited</span>}
      </span>
      <input
        name={name}
        type="number"
        step={step}
        min={min}
        required={!optional}
        disabled={!!locked}
        defaultValue={value ?? ""}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 tabular-nums invalid:border-red-400 disabled:bg-stone-100 disabled:text-stone-500"
      />
      {(locked || hint) && <span className="mt-0.5 block text-xs text-stone-500">{locked ? `🔒 ${locked}` : hint}</span>}
    </label>
  );
}

/**
 * Edit the numbers the platform holds for the farm. Saving sends nothing to the engine directly:
 * every page re-runs the engine with the new numbers.
 */
export default async function FarmDataPage({ searchParams }) {
  const { m, v, saved, reset } = await searchParams;
  const byMonth = v === "months";
  const farm = await loadFarm();
  const edits = await readEdits(farm.profile.id);
  const { role } = await getViewer();
  const lock = (path) => (ownerOf(path) === role ? null : role === "owner" ? `Set by ${ADVISOR.name}, your advisor` : `${farm.profile.name}'s record`);
  const ownEdits = Object.keys(edits).filter((p) => ownerOf(p) === role).length;
  const actualMonths = farm.months.map((x) => x.month);
  const month = actualMonths.includes(Number(m)) ? Number(m) : farm.actual_through_month;
  const record = farm.months.find((x) => x.month === month);
  const valueOf = (path) => path.split(".").reduce((o, k) => o?.[k], record);
  const firstForecast = farm.actual_through_month + 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farm data</h1>
          <p className="text-sm text-stone-500">
            The numbers FarmBiddy holds for {farm.profile.farm_name}.{" "}
            {role === "owner" ? "You keep the records; your advisor sets the forecast assumptions." : "The farmer keeps the records; you set the forecast assumptions."} Every
            change is recalculated by the Financial Engine on every page, report and Biddy answer.
          </p>
        </div>
        {ownEdits > 0 && (
          <form action={resetFarmData}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">Reset to demo data</button>
          </form>
        )}
      </div>

      {(saved || reset) && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {saved ? "Saved. " : "Back to the demo data. "}
          <Link href="/farm-financials" className="font-medium underline">
            See Farm Financials
          </Link>{" "}
          or the{" "}
          <Link href="/dashboard" className="font-medium underline">
            Dashboard
          </Link>
          .
        </p>
      )}

      {/* key: remount on a new view, month or reset so the uncontrolled inputs show the stored values */}
      <AutoSaveForm key={`${byMonth ? month : "year"}:${reset ?? ""}`} action={autosaveFarmData} className="space-y-6">
        <input type="hidden" name="_month" value={month} />

        <Card title="Farm" subtitle="Leave a field empty if you don’t know it: Biddy will ask for it.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="milking_cows" label="Milking cows" unit="cows" value={farm.milking_cows} edited={"milking_cows" in edits} optional locked={lock("milking_cows")} />
            <Field name="hectares" label="Farmed area" unit="hectares" step="0.1" value={farm.hectares} edited={"hectares" in edits} locked={lock("hectares")} />
            <Field
              name="opening_cash"
              label={`Bank balance on 1 Jan ${farm.year}`}
              unit="€ (negative = overdraft)"
              value={farm.opening_cash}
              edited={"opening_cash" in edits}
              locked={lock("opening_cash")}
              optional
              min={undefined}
            />
          </div>
        </Card>

        <Card title="Milk price for the forecast" subtitle={`Used for ${monthLabel(firstForecast)}–Dec. Default comes from the market price feed.`}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="market.milk_price"
              label="Expected milk price"
              unit="€/litre"
              step="0.001"
              value={forecastMilkPrice(farm, firstForecast)}
              edited={"market.milk_price" in edits}
              locked={lock("market.milk_price")}
            />
          </div>
        </Card>

        <Card
          title="Your year so far"
          subtitle={`${monthLabel(1)}–${monthLabel(farm.actual_through_month)} ${farm.year}: what actually happened, from co-op statements, bank and invoices.`}
        >
          <nav aria-label="View" className="mb-4 flex flex-wrap gap-1.5">
            {[
              ["Year totals", "/farm-data", !byMonth],
              ["Month by month", `/farm-data?v=months&m=${month}`, byMonth],
            ].map(([label, href, on]) => (
              <Link key={label} href={href} aria-current={on ? "page" : undefined} className={pill(on)}>
                {label}
              </Link>
            ))}
          </nav>
          {byMonth ? (
            <>
              <nav aria-label="Month" className="mb-4 flex flex-wrap gap-1.5">
                {actualMonths.map((x) => (
                  <Link key={x} href={`/farm-data?v=months&m=${x}`} aria-current={x === month ? "page" : undefined} className={pill(x === month)}>
                    {monthLabel(x)}
                    {Object.keys(edits).some((p) => p.startsWith(`months.${x}.`)) ? " •" : ""}
                  </Link>
                ))}
              </nav>
              <div className="grid gap-4 sm:grid-cols-3">
                {MONTH_FIELDS.map(([path, label, unit, step]) => (
                  <Field
                    key={path}
                    name={`months.${month}.${path}`}
                    label={label}
                    unit={unit}
                    step={step}
                    value={valueOf(path) == null ? 0 : +valueOf(path).toFixed(step === "1" ? 0 : 4)}
                    edited={`months.${month}.${path}` in edits || `months_scale.${path}` in edits}
                    locked={lock(`months.${month}.${path}`)}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-500">
                A month you change here stays as you typed it, even if you change the year total later. Costs are paid in the same month; the
                milk cheque is what the co-op paid in.
              </p>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {MONTH_FIELDS.map(([path, label, unit, step]) => (
                  <Field
                    key={path}
                    name={`year.${path}`}
                    label={path === "pl.milk_price" ? "Average milk price paid" : label}
                    unit={unit}
                    step={step === "1" ? "1" : "0.0001"}
                    value={+yearValue(farm, path).toFixed(step === "1" ? 0 : 4)}
                    edited={`months_scale.${path}` in edits || Object.keys(edits).some((p) => p.startsWith("months.") && p.endsWith(`.${path}`))}
                    locked={lock(`months_scale.${path}`)}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-500">
                One figure for the year is enough. Change a total and we spread it over the months the way your figures already run (more feed
                in winter, more fertiliser in spring). Know a month exactly? Use Month by month.
              </p>
            </>
          )}
        </Card>

        <Card title="A new loan" subtitle="Terms used for “How much more could I borrow?”">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="new_loan_terms.annual_rate_pct"
              label="Interest rate"
              unit="% a year"
              step="0.01"
              value={farm.new_loan_terms?.annual_rate == null ? null : +(farm.new_loan_terms.annual_rate * 100).toFixed(4)}
              edited={"new_loan_terms.annual_rate" in edits}
              locked={lock("new_loan_terms.annual_rate")}
            />
            <Field name="new_loan_terms.term_months" label="Term" unit="months" value={farm.new_loan_terms?.term_months} edited={"new_loan_terms.term_months" in edits} locked={lock("new_loan_terms.term_months")} />
            <Field
              name="new_loan_terms.min_cover"
              label="Lender’s minimum cover"
              unit="×"
              step="0.01"
              min="1"
              value={farm.new_loan_terms?.min_cover}
              edited={"new_loan_terms.min_cover" in edits}
              locked={lock("new_loan_terms.min_cover")}
            />
          </div>
        </Card>

      </AutoSaveForm>
    </div>
  );
}
