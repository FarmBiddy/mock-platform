/**
 * Financial Engine base URL.
 * Single place that reads NEXT_PUBLIC_FINANCIAL_ENGINE_URL.
 */
export function getFinancialEngineBaseUrl() {
  const url = process.env.NEXT_PUBLIC_FINANCIAL_ENGINE_URL;

  if (!url || typeof url !== "string" || url.trim() === "") {
    return "http://127.0.0.1:8000";
  }

  return url.replace(/\/$/, "");
}
