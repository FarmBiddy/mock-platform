# FarmBiddy Mock Platform

Standalone Next.js prototype of the FarmBiddy farmer app. Demo user Joe Bloggs
(dairy): monthly farm data lives in the platform, is sent to the external
**FarmBiddy Financial Engine** over HTTP/JSON, and Farm Financials shows the
results (monthly P&L, YTD breakdowns, cash balance, loans, suppliers, events).

This project contains **no financial calculation logic**. All P&L maths live in
the Financial Engine.

## Prerequisites

- Node.js 22+ (or current LTS)
- npm
- Financial Engine running separately on `http://127.0.0.1:8000`
  (e.g. `python run_server.py` in that repository)

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` if your engine URL differs:

```
NEXT_PUBLIC_FINANCIAL_ENGINE_URL=http://127.0.0.1:8000
```

## Run

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
