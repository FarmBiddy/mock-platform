# FarmBiddy Mock Platform

Standalone Next.js prototype that collects annual Dairy farm inputs, calls the
external **FarmBiddy Financial Engine** over HTTP/JSON, and displays the
calculated Operating Statement.

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

Open [http://localhost:3000](http://localhost:3000) (use `localhost`, not
`127.0.0.1`, so the engine’s default CORS allowlist matches).

Farm Financials: [http://localhost:3000/farm-financials](http://localhost:3000/farm-financials)

## Architecture

```
Mock Platform (this app)  --HTTP/JSON-->  Financial Engine (separate repo)
       ↑                                         |
       +------------- structured result ---------+
```

- Integration client: `lib/financial-engine/`
- Platform-only mock panels: `data/platform-mocks/` (never sent to the engine)

## Smoke check (I3)

See [docs/I3-verification.md](docs/I3-verification.md) for the full checklist.

1. Start the Financial Engine.
2. Open `/farm-financials` with the sample defaults filled in.
3. Click **Calculate annual financials**.
4. Confirm displayed figures match the approved reference:
   - Operating Income: 240000
   - Schemes: 25000
   - Operating Costs: 163000
   - Operating Surplus: 77000
   - Margin: 32.08%
   - Loan repayments: 12000

## Scripts

| Command       | Purpose              |
|---------------|----------------------|
| `npm run dev` | Local development    |
| `npm run build` | Production build   |
| `npm run lint` | ESLint               |
