"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { askBiddy } from "@/app/chat/actions";
import { getChat, newId, saveChat, useChats } from "@/lib/chats";
import ResultView from "./ResultView";

const SUGGESTIONS = ["Will I have cash for the December feed bill?", "Am I profitable this year?", "How much do I owe on my loans?"];
const AGENT_LABELS = { finance: "Finance agent", schemes: "Schemes agent" };

/** One chat with Biddy. State lives in the chat store; `initialQuestion` comes from the header box. */
export default function ChatView({ chatId, initialQuestion }) {
  const router = useRouter();
  const chat = useChats().find((c) => c.id === chatId);
  const pending = chat?.messages.at(-1)?.status === "pending";
  const sentInitial = useRef(false);
  const bottom = useRef(null);

  async function send(question) {
    const q = question.trim();
    if (!q) return;
    let current = chatId && getChat(chatId);
    if (!current) {
      current = { id: newId(), title: q.slice(0, 60), createdAt: new Date().toISOString(), messages: [] };
      router.replace(`/chat?c=${current.id}`);
    }
    const history = current.messages.filter((m) => m.status !== "pending");
    const placeholder = { id: newId(), role: "biddy", text: "", status: "pending" };
    saveChat({ ...current, messages: [...history, { id: newId(), role: "user", text: q }, placeholder] });

    let res;
    try {
      res = await askBiddy({ chatId: current.id, messages: history, question: q, screen: { page: "chat", card: null } });
    } catch {
      res = { status: "error", agent: null, error: { code: "network", message: "Couldn't reach Biddy. Try again." } };
    }
    const reply =
      res.status === "answer"
        ? { role: "biddy", status: "answer", agent: res.agent, text: res.answer.text, results: res.answer.results, follow_ups: res.answer.follow_ups, unverified: res.answer.unverified }
        : res.status === "needs_input"
          ? { role: "biddy", status: "needs_input", agent: res.agent, text: res.missing.map((m) => m.question).join(" "), missing: res.missing }
          : { role: "biddy", status: "error", agent: res.agent, text: res.error.message };
    const latest = getChat(current.id) ?? current;
    saveChat({ ...latest, messages: latest.messages.map((m) => (m.id === placeholder.id ? { ...reply, id: m.id } : m)) });
  }

  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true;
      send(initialQuestion);
    }
    // send is stable enough for a one-shot on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" }); // braces: newer browsers return a Promise here, not a cleanup
  }, [chat?.messages.length, pending]);

  function onSubmit(e) {
    e.preventDefault();
    const input = e.currentTarget.elements.q;
    send(input.value);
    input.value = "";
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold tracking-tight">{chat?.title ?? "New chat with Biddy"}</h1>

      {!chat && !initialQuestion && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
          <p className="text-sm text-stone-600">Ask about your farm’s money. Biddy answers with figures from the Financial Engine.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-4" aria-live="polite">
        {chat?.messages.map((m) =>
          m.role === "user" ? (
            <li key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-emerald-800 px-4 py-2 text-sm text-white">
              {m.text}
            </li>
          ) : (
            <li key={m.id} className="max-w-full self-start rounded-2xl rounded-bl-sm bg-white p-4 text-sm shadow-sm ring-1 ring-stone-200/70">
              <p className="mb-1 text-xs font-medium text-emerald-800">✦ Biddy{m.agent ? ` · ${AGENT_LABELS[m.agent] ?? m.agent}` : ""}</p>
              {m.status === "pending" ? (
                <p className="animate-pulse text-stone-500">Thinking…</p>
              ) : (
                <>
                  <p className={m.status === "error" ? "text-stone-500" : "text-stone-800"}>{m.text}</p>
                  {m.unverified?.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-red-700">⚠ Some figures in this answer don’t match the engine results. Don’t rely on them.</p>
                  )}
                  {m.results?.map((r, i) => <ResultView key={i} result={r} />)}
                  {m.follow_ups?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.follow_ups.map((f) => (
                        <button key={f} disabled={pending} onClick={() => send(f)} className="rounded-full px-3 py-1 text-xs text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          ),
        )}
      </ol>

      <form onSubmit={onSubmit} className="sticky bottom-20 flex gap-2 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-stone-200 lg:bottom-4">
        <input name="q" required maxLength={1000} placeholder="Ask Biddy…" aria-label="Message Biddy" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
        <button disabled={pending} className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
          Send
        </button>
      </form>
      <div ref={bottom} />
    </div>
  );
}
