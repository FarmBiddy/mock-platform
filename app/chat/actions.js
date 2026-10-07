"use server";

import { ask } from "@/lib/biddy";
import { runFarm } from "@/lib/financials/farm";
import { loadFarm } from "@/lib/farm-edits";
import { ADVISOR, getViewer } from "@/lib/session";
import { cashChartData, surplusChartData } from "@/lib/financials/views";

const MAX_QUESTION = 1000;
const MAX_HISTORY = 20;

/**
 * Ask Biddy from a chat. Everything from the browser is untrusted: trimmed and capped here.
 * The platform builds the request (farm profile + engine inputs); Biddy's agent calls the engine.
 * Who is asking comes from the session, never from the browser: the owner about their farm, the advisor
 * about the client that is open (scope "farm") or about all clients from the portfolio (scope "portfolio").
 */
export async function askBiddy({ chatId, messages, question, screen }) {
  const q = String(question ?? "").trim().slice(0, MAX_QUESTION);
  if (!q) return { status: "error", agent: null, error: { code: "empty_question", message: "Type a question first." } };

  const history = (Array.isArray(messages) ? messages : [])
    .slice(-MAX_HISTORY)
    .filter((m) => (m?.role === "user" || m?.role === "biddy") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_QUESTION * 4), ...(m.agent ? { agent: String(m.agent) } : {}) }));

  const { role, farmId } = await getViewer();
  const now = new Date();
  const request = {
    conversation: { id: String(chatId ?? "").slice(0, 64), messages: history },
    question: q,
    as_of: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
    screen: { page: String(screen?.page ?? "chat").slice(0, 64), card: screen?.card ? String(screen.card).slice(0, 64) : null },
    viewer: role === "advisor" ? { role, name: ADVISOR.name, org: ADVISOR.org } : { role },
  };

  if (role === "advisor" && !farmId) {
    // Portfolio copilot: every client with the same engine inputs its pages use.
    const clients = await Promise.all(
      ADVISOR.clients.map(async (id) => {
        const f = await loadFarm(id);
        return { farm: farmInfo(f), inputs: (await runFarm(f)).inputs };
      }),
    );
    return ask({ ...request, scope: "portfolio", clients });
  }

  const farm = await loadFarm();
  const { inputs } = await runFarm(farm);
  const response = await ask({ ...request, scope: "farm", farm: farmInfo(farm), inputs });

  if (response.status === "answer") {
    response.answer.results = response.answer.results.map((r) => ({ ...r, view: toView(farm, r) }));
  }
  return response;
}

const farmInfo = (farm) => ({
  id: farm.profile.id,
  name: farm.profile.farm_name,
  owner: farm.profile.name,
  enterprise: farm.profile.enterprise,
  currency: "EUR",
  actual_through_month: farm.actual_through_month,
});

/** Ready-to-render data for each result's `show`, using the same mappings as the Financials page. */
function toView(farm, { show, response }) {
  if (response?.status !== "ok") return null;
  if (show === "cash_by_month") return { kind: show, data: cashChartData(farm, response.result.months) };
  if (show === "surplus_by_month") return { kind: show, data: surplusChartData(farm, response.result.months) };
  if (show === "loans") return { kind: show, loans: farm.loans };
  if (show === "borrowing") return { kind: show };
  return null;
}
