"use client";

import { useActionState } from "react";
import { applyAccounts, readAccountsFile } from "@/app/farm-data/actions";

const SAMPLE = "/samples/Bloggs-Farm-Accounts-2025.pdf";

/**
 * "Upload last year's accounts": pick the accountant's PDF → we read it and show every figure we found →
 * the farmer says "use these figures" (or cancels). Nothing is saved before that.
 */
export default function AccountsUpload({ imported }) {
  const [read, readAction, reading] = useActionState(readAccountsFile, null);
  const groups = read?.found ? Object.entries(Object.groupBy(read.found, (f) => f.group)) : [];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
      <h2 className="text-base font-semibold">Last year’s accounts</h2>
      <p className="mt-0.5 text-sm text-stone-500">
        {imported
          ? `Figures from your ${imported} accounts are in use. Upload a newer set any time.`
          : "Upload the financial statements and tax computation your accountant sends you (PDF). We’ll read the figures and show you them before using any."}
      </p>

      {!read?.found && (
        <form action={readAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-stone-200"
          />
          <button disabled={reading} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
            {reading ? "Reading…" : "Read my accounts"}
          </button>
          <a href={SAMPLE} download className="text-sm text-emerald-800 underline">
            No accounts to hand? Download a sample
          </a>
          {read?.error && (
            <p role="alert" className="w-full text-sm text-red-700">
              {read.error}
            </p>
          )}
        </form>
      )}

      {read?.found && (
        <form action={applyAccounts} className="mt-4 space-y-4">
          <p className="text-sm text-stone-700">
            From <strong>{read.fileName}</strong> ({read.year} accounts) we found:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(([group, items]) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{group}</p>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {items.map((f) => (
                      <tr key={f.label} className="border-t border-stone-100">
                        <td className="py-1 pr-3 text-stone-600">{f.label}</td>
                        <td className="py-1 text-right font-medium tabular-nums">{f.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {read.skipped.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-stone-500">
              {read.skipped.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <input type="hidden" name="edits" value={JSON.stringify(read.edits)} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900">Use these figures</button>
            <a href="/farm-data" className="text-sm text-stone-600 underline">
              Cancel
            </a>
          </div>
        </form>
      )}
    </section>
  );
}
