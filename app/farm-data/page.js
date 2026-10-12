import Link from "next/link";
import { Card } from "@/components/ui";
import AutoSaveForm from "@/components/AutoSaveForm";
import { canEdit, loadFarm, readEdits, yearValue } from "@/lib/farm-edits";
import { CENTS, CHEQUE, FIELD_GROUPS, hasRecords, ownFigure } from "@/lib/farm-fields";
import { ADVISOR, getViewer } from "@/lib/session";
import { forecastMilkPrice } from "@/lib/financials/farm";
import { monthLabel } from "@/lib/format/date";
import { autosaveFarmData, resetFarmData } from "./actions";

export const metadata = { title: "Farm data · FarmBiddy" };

const pill = (on) =>
  `rounded-full px-3 py-1 text-sm ring-1 ${on ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`;
const chip = (tone, text) => <span className={`rounded-full px-1.5 text-[10px] font-medium ${tone}`}>{text}</span>;

/**
 * One number. `locked`: why this viewer can't change it, shown instead of the hint.
 * `cents`: typed in c/litre, saved in €/litre (the "c:" name prefix).
 */
function Field({ name, label, unit, step = "1", value, edited, hint, optional, min = "0", locked, cents }) {
  return (
    <label className="block text-sm">
      <span className="flex flex-wrap items-center gap-x-2 text-stone-700">
        {label} <span className="text-xs text-stone-400">{unit}</span>
        {edited && chip("bg-amber-100 text-amber-800", "edited")}
      </span>
      <input
        name={cents ? `c:${name}` : name}
        type="number"
        step={cents ? "0.01" : step}
        min={min}
        required={!optional && value != null && value !== ""}
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
  const farmId = farm.profile.id;
  const edits = await readEdits(farmId);
  const { role } = await getViewer();
  const hasAdvisor = ADVISOR.clients.includes(farmId);
  const lock = (path) => (canEdit(role, farmId, path) ? null : role === "owner" ? `Set by ${ADVISOR.name}, your advisor` : `${farm.profile.name}'s record`);
  const ownEdits = Object.keys(edits).filter((p) => canEdit(role, farmId, p)).length;
  const starter = Boolean(farm.profile.starter);
  const actualMonths = farm.months.map((x) => x.month);
  const month = actualMonths.includes(Number(m)) ? Number(m) : farm.actual_through_month;
  const record = farm.months.find((x) => x.month === month);
  const valueOf = (path) => path.split(".").reduce((o, k) => o?.[k], record);
  const firstForecast = farm.actual_through_month + 1;
  // A new farmer's fields start empty, not at 0: nothing has been entered yet.
  const show = (path, v) => (starter && !ownFigure(edits, path) ? "" : v == null ? 0 : CENTS.has(path) ? +(v * 100).toFixed(2) : Math.round(v));
  const fresh = starter && !hasRecords(farm);
  const t = farm.new_loan_terms ?? {};
  const forecastPrice = forecastMilkPrice(farm, firstForecast);
  const settings = (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field
        name="market.milk_price"
        label={`Milk price, ${monthLabel(firstForecast)}–Dec`}
        unit="c/litre"
        cents
        value={+(forecastPrice * 100).toFixed(2)}
        edited={"market.milk_price" in edits}
        locked={lock("market.milk_price")}
        hint="What you expect the co-op to pay for the rest of the year"
      />
      <Field
        name="new_loan_terms.annual_rate_pct"
        label="New loan: interest rate"
        unit="% a year"
        step="0.01"
        value={t.annual_rate == null ? null : +(t.annual_rate * 100).toFixed(4)}
        edited={"new_loan_terms.annual_rate" in edits}
        locked={lock("new_loan_terms.annual_rate")}
      />
      <Field name="new_loan_terms.term_months" label="New loan: term" unit="months" value={t.term_months} edited={"new_loan_terms.term_months" in edits} locked={lock("new_loan_terms.term_months")} />
      <Field
        name="new_loan_terms.min_cover"
        label="Lender’s minimum cover"
        unit="×"
        step="0.01"
        min="1"
        value={t.min_cover}
        edited={"new_loan_terms.min_cover" in edits}
        locked={lock("new_loan_terms.min_cover")}
        hint="How many times over the bank wants repayments covered"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farm data</h1>
          <p className="text-sm text-stone-500">
            The numbers FarmBiddy holds for {farm.profile.farm_name}. Every change is recalculated on every page, report and Biddy answer.
          </p>
        </div>
        {ownEdits > 0 && (
          <form action={resetFarmData}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">
              {starter ? "Start again" : "Reset to demo data"}
            </button>
          </form>
        )}
      </div>

      {starter && role === "owner" && (
        <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-200">
          <p className="font-medium">Welcome, {farm.profile.name.split(" ")[0]}.</p>
          <p className="mt-1">
            {fresh
              ? "Nothing’s been added yet. Start with your cows and bank balance, then your year totals, milk first. Every page fills in as you go."
              : farm.opening_cash == null
                ? "Add your bank balance on 1 January to see your cash flow."
                : "Keep going: every figure you add sharpens your numbers."}
          </p>
        </div>
      )}

      {(saved || reset) && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {saved ? "Saved. " : starter ? "Back to the starter figures. " : "Back to the demo data. "}
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
              unit="€ (minus = overdraft)"
              value={farm.opening_cash}
              edited={"opening_cash" in edits}
              locked={lock("opening_cash")}
              optional
              min={undefined}
              hint={farm.opening_cash == null ? "Needed for your cash flow: from your 1 January bank statement" : "From your 1 January bank statement"}
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
          {byMonth && (
            <nav aria-label="Month" className="mb-4 flex flex-wrap gap-1.5">
              {actualMonths.map((x) => (
                <Link key={x} href={`/farm-data?v=months&m=${x}`} aria-current={x === month ? "page" : undefined} className={pill(x === month)}>
                  {monthLabel(x)}
                  {Object.keys(edits).some((p) => p.startsWith(`months.${x}.`)) ? " •" : ""}
                </Link>
              ))}
            </nav>
          )}
          <div className="space-y-6">
            {FIELD_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{group.title}</legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  {group.fields.map(([path, label, unit, hint]) => {
                    const own = ownFigure(edits, path);
                    return byMonth ? (
                      <Field
                        key={path}
                        name={`months.${month}.${path}`}
                        label={label}
                        unit={unit}
                        cents={CENTS.has(path)}
                        value={show(path, valueOf(path))}
                        edited={`months.${month}.${path}` in edits || `months_scale.${path}` in edits}
                        locked={lock(`months.${month}.${path}`)}
                        hint={hint}
                      />
                    ) : (
                      <Field
                        key={path}
                        name={`year.${path}`}
                        label={CENTS.has(path) ? `Average ${label.toLowerCase()}` : label}
                        unit={unit}
                        cents={CENTS.has(path)}
                        value={show(path, yearValue(farm, path))}
                        edited={!starter && own}
                        locked={lock(`months_scale.${path}`)}
                        hint={hint}
                      />
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <details className="rounded-lg bg-stone-50 px-3 py-2 text-sm" open={ownFigure(edits, CHEQUE[0]) || undefined}>
              <summary className="cursor-pointer text-stone-700">
                Milk cheques: worked out from litres × price, paid the month after.{" "}
                <span className="text-emerald-800 underline">Different on your bank statement?</span>
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field
                  name={byMonth ? `months.${month}.${CHEQUE[0]}` : `year.${CHEQUE[0]}`}
                  label={CHEQUE[1]}
                  unit={CHEQUE[2]}
                  value={show(CHEQUE[0], byMonth ? valueOf(CHEQUE[0]) : yearValue(farm, CHEQUE[0]))}
                  edited={ownFigure(edits, CHEQUE[0])}
                  locked={lock(`months_scale.${CHEQUE[0]}`)}
                  hint={CHEQUE[3]}
                />
              </div>
            </details>
          </div>
          <p className="mt-4 text-xs text-stone-500">
            {byMonth
              ? "A month you change here stays as you typed it, even if you change the year total later."
              : "One figure for the year is enough. Change a total and we spread it over the months the way your figures already run (more feed in winter, more fertiliser in spring). Know a month exactly? Use Month by month."}
          </p>
        </Card>

        {role === "owner" ? (
          <details className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
            <summary className="cursor-pointer text-sm">
              <span className="font-semibold">Forecast settings</span>
              <span className="text-stone-500">
                {" "}
                · milk {(forecastPrice * 100).toFixed(1)}c/litre for {monthLabel(firstForecast)}–Dec
                {t.annual_rate != null && ` · new loan ${(t.annual_rate * 100).toFixed(1)}% over ${t.term_months / 12} years`}
                {hasAdvisor ? ` · set by ${ADVISOR.name}, your advisor` : " · change them if you know better"}
              </span>
            </summary>
            <div className="mt-4">{settings}</div>
          </details>
        ) : (
          <Card title="Forecast settings" subtitle="Your assumptions for this client: the rest of the year’s milk price and the terms for a new loan.">
            {settings}
          </Card>
        )}
      </AutoSaveForm>
    </div>
  );
}
