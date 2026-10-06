"use server";

import { ask } from "@/lib/biddy";
import { getFarm, runFarm } from "@/lib/financials/farm";
import { cashChartData, surplusChartData } from "@/lib/financials/views";

const MAX_QUESTION = 1000;
const MAX_HISTORY = 20;

/**
 * Ask Biddy from a chat. Everything from the browser is untrusted: trimmed and capped here.
 * The platform builds the request (farm profile + engine inputs); Biddy's agent calls the engine.
 */
export async function askBiddy({ chatId, messages, question, screen }) {
  const q = String(question ?? "").trim().slice(0, MAX_QUESTION);
  if (!q) return { status: "error", agent: null, error: { code: "empty_question", message: "Type a question first." } };

  const history = (Array.isArray(messages) ? messages : [])
    .slice(-MAX_HISTORY)
    .filter((m) => (m?.role === "user" || m?.role === "biddy") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_QUESTION * 4), ...(m.agent ? { agent: String(m.agent) } : {}) }));

  const farm = getFarm();
  const { inputs } = await runFarm(farm);
  const now = new Date();

  const response = await ask({
    conversation: { id: String(chatId ?? "").slice(0, 64), messages: history },
    question: q,
    as_of: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
    screen: { page: String(screen?.page ?? "chat").slice(0, 64), card: screen?.card ? String(screen.card).slice(0, 64) : null },
    farm: {
      id: farm.profile.id,
      name: farm.profile.farm_name,
      enterprise: farm.profile.enterprise,
      currency: "EUR",
      actual_through_month: farm.actual_through_month,
    },
    inputs,
  });

  if (response.status === "answer") {
    response.answer.results = response.answer.results.map((r) => ({ ...r, view: toView(farm, r) }));
  }
  return response;
}

/** Ready-to-render data for each result's `show`, using the same mappings as the Financials page. */
function toView(farm, { show, response }) {
  if (response?.status !== "ok") return null;
  if (show === "cash_by_month") return { kind: show, data: cashChartData(farm, response.result.months) };
  if (show === "surplus_by_month") return { kind: show, data: surplusChartData(farm, response.result.months) };
  if (show === "loans") return { kind: show, loans: farm.loans };
  if (show === "borrowing") return { kind: show };
  return null;
}
