"use client";

import { useState } from "react";
import AnnualDairyForm from "@/components/financials/AnnualDairyForm";
import ResultsPanel from "@/components/financials/ResultsPanel";
import StatusBanner from "@/components/financials/StatusBanner";
import LoanCards from "@/components/platform/LoanCards";
import SupplierBalances from "@/components/platform/SupplierBalances";
import UpcomingEvents from "@/components/platform/UpcomingEvents";
import AnnualChart from "@/components/platform/AnnualChart";
import { runAnnualPlSummary } from "@/lib/financial-engine/client";
import { SAMPLE_ANNUAL_DAIRY_INPUTS } from "@/lib/financials/sampleInputs";

/**
 * Annual Farm Financials page.
 * Form → HTTP → Financial Engine → display. No local financial maths.
 */
export default function FarmFinancialsPage() {
  const [values, setValues] = useState(() => ({ ...SAMPLE_ANNUAL_DAIRY_INPUTS }));
  const [phase, setPhase] = useState("idle");
  const [response, setResponse] = useState(null);

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleReset() {
    setValues({ ...SAMPLE_ANNUAL_DAIRY_INPUTS });
    setPhase("idle");
    setResponse(null);
  }

  async function handleSubmit() {
    const payload = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === "" || value === null || value === undefined) continue;
      const num = Number(value);
      if (!Number.isFinite(num)) continue;
      payload[key] = num;
    }

    setPhase("loading");
    setResponse(null);

    const outcome = await runAnnualPlSummary(payload);
    setResponse(outcome);
    setPhase(outcome.kind === "ok" ? "ok" : outcome.kind);
  }

  const engineResult =
    response?.kind === "ok" ? response.body?.result ?? null : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          FarmBiddy Mock Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Farm Financials
        </h1>
        <p className="max-w-2xl text-sm text-stone-600">
          Annual Dairy Operating Statement. Enter farm drivers below; totals and
          margins come from the external Financial Engine over HTTP — this page
          does not calculate them.
        </p>
      </header>

      <div className="mb-6">
        <StatusBanner phase={phase} response={response} />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="rounded border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            Annual inputs
          </h2>
          <AnnualDairyForm
            values={values}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onReset={handleReset}
            isLoading={phase === "loading"}
          />
        </section>

        <section className="rounded border border-stone-200 bg-white p-5 shadow-sm">
          <ResultsPanel result={engineResult} />
        </section>
      </div>

      <div className="mt-12 space-y-8 border-t border-stone-200 pt-10">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Platform overview
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            The panels below use mock Platform data only. They are not Financial
            Engine capabilities and are never included in the calculation
            request.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <LoanCards />
          <SupplierBalances />
          <UpcomingEvents />
          <AnnualChart />
        </div>
      </div>
    </div>
  );
}
