# FarmBiddy Mock Platform

Standalone Next.js prototype of the FarmBiddy farmer app. Demo user Joe Bloggs
(dairy): monthly farm data lives in the platform, is sent to the external
**FarmBiddy Financial Engine** over HTTP/JSON, and Farm Financials shows the
results (monthly P&L and forecast, cash, KPIs, vs last year, what-if, loans, borrowing
capacity), plus bank / advisor / accountant reports and Ask Biddy chats.

This project contains **no financial calculation logic**. All P&L maths live in
the Financial Engine.

## Prerequisites

- Node.js 22+ (or current LTS)
- npm
- Python with the engine's requirements (`py` launcher on Windows)
- The Financial Engine repo next to this one (`../REMOTE-FUNCTIONS`)

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` if your engine URL differs:

```
FINANCIAL_ENGINE_URL=http://127.0.0.1:8000
# ENGINE_API_KEY=   # only when the engine requires a service token
```

## Run

The engine runs from a separate checkout of its `main` (a git worktree at `../engine-main`), so
work in progress in `../REMOTE-FUNCTIONS` never affects the mock. Once:

```bash
git -C ../REMOTE-FUNCTIONS worktree add --detach ../engine-main origin/main
```

To pick up a newer engine main later:

```bash
git -C ../engine-main fetch origin && git -C ../engine-main checkout --detach origin/main
```

Start both (or use the `engine` and `web` entries in `.claude/launch.json`):

```bash
py -m uvicorn --app-dir ../engine-main api.app:app --host 127.0.0.1 --port 8000
```

```bash
npm run dev
```

Open [http://localhost:3000/farm-financials](http://localhost:3000/farm-financials).

## Architecture

```
data/farms/<user>.json  ->  lib/financials/farm.js (payload builders + lib/market.js prices)
                         ->  lib/financial-engine/client.js (ONLY engine client: ok | needs_input | error)
                         ->  app/farm-financials/page.js (server component) -> components/
```

- Every money figure on screen is published by the engine. The UI only groups
  engine lines for display (e.g. Machinery & fuel = fuel + repairs_maintenance).
- Loan repayments are not operating costs: they show in Loans and in cash flow.
- `needs_input` renders a form for exactly the missing fields; answers come back
  as `?<function>:<field>=<value>` and are sent on the next engine call.
- Engine IDs not live yet can be served from `lib/financial-engine/mocks.js` with the
  same shape (badged "Coming soon"); none are mocked today. `loan.schedule` needs the
  engine's `cash-planning` work (on its way to engine main).
- Suppliers and events are platform data (mock JSON), badged "Platform".
- Ask Biddy: header box / New Chat → `/chat`. `lib/biddy.js` is the only Biddy client; without `BIDDY_URL`
  a mock agent (`data/biddy/fixtures.json`) answers by calling the engine itself. Contract:
  [docs/biddy-contract.md](docs/biddy-contract.md). `npm run check` verifies answers only quote engine figures.

## Scripts

| Command       | Purpose              |
|---------------|----------------------|
| `npm run dev` | Local development    |
| `npm run build` | Production build   |
| `npm run lint` | ESLint               |
| `npm run check` | Biddy figure checks |
