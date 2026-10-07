/**
 * Financial Engine base URL and service token. Server-only: no NEXT_PUBLIC_ prefix, so neither
 * reaches browser code (every engine call goes through server components / server actions).
 */
export function getFinancialEngineBaseUrl() {
  const url = process.env.FINANCIAL_ENGINE_URL;

  if (!url || typeof url !== "string" || url.trim() === "") {
    return "http://127.0.0.1:8000";
  }

  return url.replace(/\/$/, "");
}

/** `Authorization` header for the engine when ENGINE_API_KEY is set (engine ADR-0049), else none. */
export const engineAuthHeader = () => (process.env.ENGINE_API_KEY ? { Authorization: `Bearer ${process.env.ENGINE_API_KEY}` } : {});
