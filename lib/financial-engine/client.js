import { getFinancialEngineBaseUrl, PL_SUMMARY_PATH } from "./config";

/**
 * Call the external Financial Engine annual Operating Statement endpoint.
 *
 * Knows only: base URL, path, flat JSON body, response status envelope.
 * Does not perform financial calculations.
 *
 * @param {Record<string, number>} inputs Flat annual Dairy drivers
 * @returns {Promise<{
 *   kind: 'ok' | 'needs_input' | 'error' | 'unavailable' | 'unknown',
 *   httpStatus?: number,
 *   body?: object,
 *   message?: string,
 * }>}
 */
export async function runAnnualPlSummary(inputs) {
  const url = `${getFinancialEngineBaseUrl()}${PL_SUMMARY_PATH}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(inputs),
    });
  } catch {
    return {
      kind: "unavailable",
      message: "Financial Engine is unreachable. Is it running?",
    };
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    return {
      kind: "unavailable",
      httpStatus: response.status,
      message: "Financial Engine returned a non-JSON response.",
    };
  }

  if (response.status === 404) {
    return {
      kind: "error",
      httpStatus: 404,
      body,
      message:
        body?.error?.code === "unknown_calculation"
          ? "Unknown calculation"
          : "Calculation endpoint not found",
    };
  }

  if (!response.ok && response.status !== 200) {
    return {
      kind: "unavailable",
      httpStatus: response.status,
      body,
      message: `Financial Engine HTTP ${response.status}`,
    };
  }

  const status = body?.status;

  if (status === "ok") {
    return { kind: "ok", httpStatus: response.status, body };
  }
  if (status === "needs_input") {
    return { kind: "needs_input", httpStatus: response.status, body };
  }
  if (status === "error") {
    return { kind: "error", httpStatus: response.status, body };
  }

  return {
    kind: "unknown",
    httpStatus: response.status,
    body,
    message: "Unexpected response status from Financial Engine",
  };
}
