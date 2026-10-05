const fmt = (opts) => new Intl.DateTimeFormat("en-IE", { ...opts, timeZone: "UTC" });

/** 1 → "Jan" */
export const monthLabel = (month, year = 2000) => fmt({ month: "short" }).format(Date.UTC(year, month - 1));

/** "2026-10-20" → "20 Oct" */
export const dayLabel = (iso) => fmt({ day: "numeric", month: "short" }).format(new Date(iso));
