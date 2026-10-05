import { formatCurrency } from "@/lib/format/currency";
import { formatMarginPct } from "@/lib/format/percent";
import { monthLabel } from "@/lib/format/date";

const TONES = {
  good: { icon: "✓", ring: "ring-emerald-200", chip: "bg-emerald-100 text-emerald-800" },
  warn: { icon: "!", ring: "ring-amber-200", chip: "bg-amber-100 text-amber-800" },
  bad: { icon: "✕", ring: "ring-red-200", chip: "bg-red-100 text-red-800" },
  none: { icon: "…", ring: "ring-stone-200", chip: "bg-stone-100 text-stone-600" },
};

/**
 * The three questions a farmer asks, answered from engine values.
 * Only compares published figures (sign / which is bigger) — never derives new money.
 */
export default function StatusTiles({ pl, cf, loans, farm }) {
  const asOf = monthLabel(farm.actual_through_month);
  const ytd = pl.status === "ok" ? pl.result.ytd : null;
  const cash = cf.status === "ok" ? cf.result : null;
  const loan = loans.status === "ok" ? loans.result : null;

  const minClosing = (ms) => (ms.length ? ms.reduce((a, b) => (b.closing_cash < a.closing_cash ? b : a)) : null);
  const lowest = minClosing(cash?.months.filter((m) => m.period.month > farm.actual_through_month) ?? []);
  // An overdraft earlier this year (e.g. spring calving) usually comes back next year — say so.
  const pastLow = minClosing(cash?.months.filter((m) => m.period.month <= farm.actual_through_month) ?? []);
  const wasOverdrawn = pastLow?.closing_cash < 0;

  const tiles = [
    ytd
      ? {
          question: "Am I profitable?",
          tone: ytd.profit.net > 0 ? "good" : "bad",
          answer: ytd.profit.net > 0 ? "Yes, this year so far" : "Not yet this year",
          value: formatCurrency(ytd.profit.net, ytd.currency),
          detail: `Operating Surplus Jan–${asOf} · ${formatMarginPct(ytd.profit.margin_pct, 0)} margin`,
        }
      : { question: "Am I profitable?", tone: "none", answer: "Needs your figures", detail: "See below" },
    lowest
      ? {
          question: "Will I have cash?",
          tone: lowest.closing_cash < 0 ? "bad" : wasOverdrawn ? "warn" : "good",
          answer:
            lowest.closing_cash < 0
              ? `Overdrawn in ${monthLabel(lowest.period.month)}`
              : "Yes, through December",
          value: formatCurrency(cash.closing_cash, cash.currency),
          detail: `Projected 31 Dec · lowest ahead ${formatCurrency(lowest.closing_cash, cash.currency)} in ${monthLabel(lowest.period.month)}`,
          note:
            lowest.closing_cash >= 0 && wasOverdrawn
              ? `You were overdrawn in ${monthLabel(pastLow.period.month)} (${formatCurrency(pastLow.closing_cash, cash.currency)}) — plan for next spring.`
              : null,
        }
      : { question: "Will I have cash?", tone: "none", answer: "Needs your figures", detail: "See cash flow below" },
    loan && ytd
      ? {
          question: "Can I pay my loans?",
          tone: ytd.profit.net > ytd.finance.loan_repayments ? "good" : "warn",
          answer: ytd.profit.net > ytd.finance.loan_repayments ? "Yes, surplus covers them" : "Surplus doesn’t cover them",
          value: `${formatCurrency(loan.total_monthly_payment, loan.currency)} / month`,
          detail: `${formatCurrency(ytd.finance.loan_repayments, ytd.currency)} repaid Jan–${asOf}`,
        }
      : { question: "Can I pay my loans?", tone: "none", answer: "Needs your figures", detail: "See loans below" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((t) => {
        const tone = TONES[t.tone];
        return (
          <section key={t.question} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${tone.ring}`}>
            <p className="text-sm text-stone-500">{t.question}</p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <span aria-hidden className={`grid h-6 w-6 place-items-center rounded-full text-xs ${tone.chip}`}>
                {tone.icon}
              </span>
              {t.answer}
            </p>
            {t.value && <p className="mt-3 text-2xl font-semibold tabular-nums">{t.value}</p>}
            <p className="mt-1 text-xs text-stone-500">{t.detail}</p>
            {t.note && <p className="mt-2 text-xs font-medium text-amber-800">{t.note}</p>}
          </section>
        );
      })}
    </div>
  );
}
