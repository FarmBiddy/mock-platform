# Biddy ⇄ Platform contract (proposal)

**Status:** draft, decisions below agreed on the platform side (Oct 2026). Biddy is still in development, so endpoint
and auth are TBD. Nothing is implemented yet.
**Goal:** test the platform → Biddy round-trip the same way we test the Financial Engine: one client, JSON fixtures,
a typed response with three statuses.

## Decisions

| Topic | Decision |
|---|---|
| Who calculates | Biddy routes to an agent; **the agent calls the Financial Engine itself**. Nobody else does money maths. |
| Farm data | Lives on the platform. Each request carries the engine **inputs** the platform builds, so the agent can run the engine (incl. what-ifs) on the farm's real data. |
| What is shown | Only the results the farmer asked for: the answer carries the engine results it used, and the chat renders those. |
| History | Kept by the **platform**, shown as separate chats (like AI chat apps: Recent + New Chat). The agent is stateless; the platform sends the conversation each time. |
| Agent visibility | The UI shows which agent answered. |
| Language | English only for now. |

## Flow

```
Farmer asks in "Ask Biddy" (new chat or an existing one)
  → Platform: conversation so far + question + farm profile + engine inputs
  → Biddy routes to an agent (finance, schemes, …)
  → Agent calls the Financial Engine as needed, writes the answer
  → Platform stores the turn in the chat and renders text + the engine results returned
```

- **Platform (this repo):** owns farm data, chats and the screen. One client (`lib/biddy.js`, to be added).
- **Biddy + agents (other team):** understand the question, call the engine, answer.
- **Financial Engine:** the only place money is calculated. Answers quote engine values; never recalculated.

## Request — `POST <BIDDY_URL>/v1/ask` (URL/auth TBD)

```json
{
  "conversation": {
    "id": "chat_7f3a",
    "messages": [
      { "role": "user", "text": "How did March go?" },
      { "role": "biddy", "agent": "finance", "text": "March made a €4,780 Operating Surplus (15% margin)…" }
    ]
  },
  "question": "Will I have cash for the December feed bill?",
  "as_of": { "year": 2026, "month": 10, "day": 5 },
  "screen": { "page": "farm-financials", "card": "cash" },
  "farm": {
    "id": "joe-bloggs",
    "name": "Bloggs Farm",
    "enterprise": "dairy",
    "currency": "EUR",
    "actual_through_month": 9
  },
  "inputs": {
    "loan.schedule": { "loans": ["… same body the platform sends to the engine …"] },
    "pl.months": { "months": ["…"], "ytd": { "year": 2026, "as_of_month": 9 } },
    "cf.months": { "opening_cash": 30000, "months": ["…"] }
  }
}
```

- `conversation.messages` is the chat so far (oldest first), without the new question.
- `screen.card` is set when asked from a card (e.g. `"cash"`), `null` from the header or the chat page.
- `inputs` are the engine request bodies exactly as the platform builds them (`lib/financials/farm.js`).
  Months after `actual_through_month` are projections (budget + market prices).
  Projected loan and milk-cheque lines depend on earlier results (loan.schedule → pl.months → cf.months); the
  platform sends them already filled in.

## Response — always one of three

```json
{
  "status": "answer",
  "agent": "finance",
  "answer": {
    "text": "Yes. You're projected to have €148,415 at the end of November and €150,264 on 31 December, after loan repayments. Your lowest point this year was March (−€8,274), so plan for next spring.",
    "results": [
      { "function": "cf.months", "show": "cash_by_month", "response": { "status": "ok", "result": { "…": "engine result, unchanged" } } }
    ],
    "figures_used": [
      { "result": 0, "path": "result.months[10].closing_cash", "value": 148415.02 },
      { "result": 0, "path": "result.closing_cash", "value": 150263.65 },
      { "result": 0, "path": "result.months[2].closing_cash", "value": -8274.08 }
    ],
    "highlights": [{ "card": "cash", "month": 12 }],
    "follow_ups": ["What if the milk price drops 5c?", "Show me the cash table"]
  }
}
```

```json
{
  "status": "needs_input",
  "agent": "finance",
  "missing": [
    { "function": "cf.months", "field": "opening_cash", "unit": "EUR", "question": "What was your bank balance on 1 January?" }
  ]
}
```

```json
{ "status": "error", "agent": null, "error": { "code": "out_of_scope", "message": "I can't help with that yet." } }
```

- `results`: engine envelopes the agent ran for this answer, unchanged. The chat renders each one with the
  platform's existing component for `show` (`cash_by_month`, `surplus_by_month`, `month_statement`,
  `expenses`, `loans`); unknown `show` values fall back to text only.
- `figures_used`: every number in `text` points at `results[result]` + `path`, so tests can check that no figure
  was invented.
- `needs_input`: the platform asks the farmer (in the chat), stores the value on the farm data at
  `function` + `path`/`field`, and re-asks.
- `highlights`: optional; on the Financials page the UI scrolls to and marks the card/month.

## Chats on the platform

- Sidebar **Recent** lists chats (newest first, title = first question); **New Chat** starts one.
- A chat page shows the turns: user text; Biddy text + agent label + rendered `results`.
- Storage: mock = per-browser storage; real = platform DB (out of scope for the mock).

## Example values (Joe Bloggs, 5 Oct 2026, engine `cash-planning`)

| Figure | Engine value |
|---|---|
| Operating Surplus YTD (Jan–Sep) | €122,950 (46.72% margin) |
| Loan repayments YTD | €14,682.24 |
| Cash end of Sep | €106,967.76 |
| Lowest cash this year | −€8,274.08 (Mar) |
| Projected cash 31 Dec | €150,263.65 |
| Loans outstanding / monthly | €65,951.03 / €1,631.37 |

## How we'd test it (platform side)

1. `lib/biddy.js`: `ask(request)` → `answer | needs_input | error`, same shape as `lib/financial-engine/client.js`.
2. `data/biddy/fixtures/*.json`: request/response pairs like the ones above. Until Biddy exists, the client
   returns a matching fixture whose `results` come from a real engine run (mock agent), so chats work end to end.
3. A check that every `figures_used.value` equals the value at its `path` in `results`.
4. Swap the mock for `BIDDY_URL` when Biddy is up. Nothing else changes.

## Still open (for the Biddy owner)

1. Endpoint, auth, timeouts, streaming or not.
2. Does Biddy accept `inputs` as above, or fetch farm data from a platform endpoint instead?
3. The list of `show` values Biddy may return.
