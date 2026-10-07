"use client";

/** Browser print dialog → "Save as PDF". No PDF library needed. */
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-900 print:hidden">
      Print / save as PDF
    </button>
  );
}
