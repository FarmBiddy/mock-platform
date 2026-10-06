/**
 * Pure helpers for "Share with my advisor" (no Next imports, so `npm run check` can test them).
 * A share is a prepared view of the farm (a page URL that reproduces it) plus a short summary and note.
 * Everything here arrives from the browser (query string, form, cookie), so it is untrusted.
 */
export const SHARED_COOKIE = "fb_shared";
export const MAX_SHARES = 5; // ponytail: cookie (~4 KB) holds the last 5; move to the platform DB with real accounts

/** Only same-site links to the pages a scenario lives on (no "//host", no other paths). */
const HREF = /^\/(plan|farm-financials|dashboard|reports)(\?[\w.~%&=+-]*)?$/;
export const safeHref = (v) => (typeof v === "string" && v.length <= 300 && HREF.test(v) ? v : null);

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** One share from untrusted input, or null when it has no valid title / link. */
export function cleanShare(raw) {
  if (!raw || typeof raw !== "object") return null;
  const href = safeHref(raw.href);
  const title = text(raw.title, 80);
  if (!href || !title) return null;
  return {
    id: text(raw.id, 12),
    farm: text(raw.farm, 40),
    title,
    summary: text(raw.summary, 200),
    note: text(raw.note, 280),
    href,
    at: text(raw.at, 30),
  };
}

export function cleanShares(raw) {
  return Array.isArray(raw) ? raw.map(cleanShare).filter(Boolean).slice(0, MAX_SHARES) : [];
}
