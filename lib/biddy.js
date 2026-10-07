import { runFunction } from "@/lib/financial-engine/client";
import { labelForInput } from "@/lib/financial-engine/mapResult";
import { fillTemplate, unverifiedFigures } from "@/lib/biddy-figures";
import fixtures from "@/data/biddy/fixtures.json";

/**
 * The ONLY Biddy client (server-side). Contract: docs/biddy-contract.md.
 * With BIDDY_URL set it calls the real Biddy; otherwise a mock agent answers from
 * data/biddy/fixtures.json — and, like the real agents, calls the Financial Engine itself.
 *
 * @typedef {{ function: string, show: string, response: object }} BiddyResult
 * @typedef {(
 *   | { status: "answer", agent: string, answer: { text: string, results: BiddyResult[], figures_used: object[], follow_ups?: string[], unverified?: object[] } }
 *   | { status: "needs_input", agent: string, missing: { function: string, field: string, unit: string, path?: string, question: string }[] }
 *   | { status: "error", agent: string | null, error: { code: string, message: string } }
 * )} BiddyResponse
 */

/** @returns {Promise<BiddyResponse>} */
export async function ask(request) {
  const response = process.env.BIDDY_URL ? await askRemote(request) : await mockAgent(request);
  // Guard for any agent, real or mock: every quoted figure must match the engine result it came with.
  if (response.status === "answer") {
    const bad = unverifiedFigures(response.answer);
    if (bad.length) response.answer.unverified = bad;
  }
  return response;
}

async function askRemote(request) {
  try {
    const res = await fetch(`${process.env.BIDDY_URL.replace(/\/$/, "")}/v1/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
    const body = await res.json();
    if (["answer", "needs_input", "error"].includes(body?.status)) return body;
    return { status: "error", agent: null, error: { code: "bad_response", message: `Biddy HTTP ${res.status}` } };
  } catch {
    return { status: "error", agent: null, error: { code: "biddy_unreachable", message: "Biddy is unreachable." } };
  }
}

/** Mock agent: keyword → intent → one engine run → template filled with engine values. */
async function mockAgent(request) {
  const q = request.question.toLowerCase();
  const intent = fixtures.intents.find((i) => i.match.some((m) => q.includes(m)));

  if (!intent) {
    return {
      status: "error",
      agent: null,
      error: { code: "out_of_scope", message: "I can answer questions about your cash, profit and loans for now. Try one of those." },
    };
  }
  if (intent.unavailable) {
    return {
      status: "error",
      agent: intent.agent,
      error: { code: "agent_unavailable", message: `The ${intent.agent} agent isn't connected yet.` },
    };
  }

  const input = request.inputs?.[intent.function];
  if (!input) {
    return { status: "error", agent: intent.agent, error: { code: "missing_inputs", message: `No ${intent.function} inputs were sent.` } };
  }

  const response = await runFunction(intent.function, input);
  if (response.status === "needs_input") {
    return {
      status: "needs_input",
      agent: intent.agent,
      missing: response.missing.map((m) => ({
        function: intent.function,
        ...m,
        question: `What is your ${labelForInput(m.field).toLowerCase()} (${m.unit})?`,
      })),
    };
  }
  if (response.status !== "ok") {
    return { status: "error", agent: intent.agent, error: { code: response.error?.code ?? "engine_error", message: response.error?.message ?? "The engine couldn't calculate this." } };
  }

  const { text, figures_used } = fillTemplate(intent.text, response, 0);
  return {
    status: "answer",
    agent: intent.agent,
    answer: {
      text,
      results: [{ function: intent.function, show: intent.show, response }],
      figures_used,
      follow_ups: intent.follow_ups,
    },
  };
}
