# Biddy ⇄ Platform contract (proposal)

**Status:** draft for the Biddy owner to accept or change. Nothing is implemented yet.
**Goal:** test the platform → Biddy round-trip the same way we test the Financial Engine: one
client, a JSON fixture, a typed response with three statuses.

## Who does what

```
Farmer types in "Ask Biddy"
  → Platform builds a request: the question + farm profile + numbers already published by the engine
  → Biddy routes it (finance agent, schemes agent, …) and answers
  → Platform renders the answer, highlights the card it refers to, or asks for a missing figure
```

- **Platform (this repo):** owns farm data and the screen. It sends the question with the engine
  results it is already showing. One client (`lib/biddy.js`, to be added) and no other caller.
- **Biddy (other team):** understands the question, picks the agent and writes the answer.
- **Financial Engine:** the only place money is calculated. Biddy, like the UI, **never
  recalculates money**: it quotes the engine figures it receives, or asks for a new engine run (see open questions).

## Request — `POST <BIDDY_URL>/v1/ask`

```json
{
  "question": "Will I have cash for the December feed bill?",
  "as_of": { "year": 2026, "month": 10, "day": 5 },
  "screen": { "page": "farm-financials", "card": null },
  "farm": {
    "id": "joe-bloggs",
    "name": "Bloggs Farm",
    "enterprise": "dairy",
    "currency": "EUR",
    "actual_through_month": 9
  },
  "context": {
    "pl.months": { "status": "ok", "result": { "...": "engine result, unchanged" } },
    "cf.months": { "status": "ok", "result": { "...": "engine result, unchanged" } },
    "loan.schedule": { "status": "ok", "result": { "...": "engine result, unchanged" } }
  },
  "pending": []
}
```

- `context` holds the **engine envelopes exactly as returned** (`ok` / `needs_input` / `error`), keyed by
  function ID. No platform-side summaries, so Biddy and the UI read the same figures.
- `screen.card` is set when the farmer asks from a card (e.g. `"cash"`); `null` from the header.
- `pending` lists engine `needs_input` items the screen is already waiting on (`{function, field, unit, path?}`),
  so Biddy can ask for them in conversation instead of the form.
- Months after `actual_through_month` are projections (budget + market prices), not actuals.

## Response — always one of three

```json
{
  "status": "answer",
  "agent": "finance",
  "answer": {
    "text": "Yes. You're projected to have €148,415 at the end of November and €150,264 on 31 December, after loan repayments. The lowest point this year was March (−€8,274), so plan for spring.",
    "highlights": [{ "card": "cash", "month": 12 }],
    "follow_ups": ["What if the milk price drops 5c?", "Show me the cash table"]
  },
  "figures_used": [
    { "function": "cf.months", "path": "result.months[10].closing_cash", "value": 148415.02 },
    { "function": "cf.months", "path": "result.closing_cash", "value": 150263.65 },
    { "function": "cf.months", "path": "result.months[2].closing_cash", "value": -8274.08 }
  ]
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
{ "status": "error", "error": { "code": "out_of_scope", "message": "I can't help with that yet." } }
```

- `figures_used` points at the engine values the text quotes, so the platform (and tests) can check that
  every number came from the engine and none was invented.
- `highlights` lets the UI scroll to and mark a card/month. Unknown cards are ignored.
- A `needs_input` answer is sent back by the platform as a value at `function` + `path`/`field`, using the same
  mechanism the screen form uses today (`?<function>:<path>=<value>`), and the engine is re-run.

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
2. `data/biddy/fixtures/*.json`: request/response pairs like the ones above. Until Biddy exists, the
   client returns the matching fixture (a mock), so the "Ask Biddy" box works end to end.
3. A check that every `figures_used.value` equals the value at its `path` in the request context.
4. Swap the mock for `BIDDY_URL` when the agent is up. Nothing else changes.

## Open questions for the Biddy owner

1. **Endpoint and auth:** URL, auth, timeouts, streaming or not?
2. **New calculations:** for a question that needs one ("what if milk drops 5c?"), does Biddy call the engine
   itself, or return a `run` request (`{function, input}`) for the platform to execute and send back?
3. **Context size:** is sending the full engine results OK, or should we send only what is on screen and let
   Biddy ask for more?
4. **Conversation:** is history kept by Biddy (session id) or sent by the platform each time?
5. **Routing visibility:** should the UI show which agent answered (`agent`)?
6. **Language:** English only for now?
