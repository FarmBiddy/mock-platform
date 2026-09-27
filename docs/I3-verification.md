# I3 Integration Verification

Checklist for the FarmBiddy Mock Platform against the Financial Engine HTTP contract.

## Separation

- [x] No Python / Financial Engine source dependency
- [x] Integration only via `lib/financial-engine/` HTTP client
- [x] Platform mock data under `data/platform-mocks/` is never POSTed to the engine
- [x] No local financial formulas (no milk revenue, cost sums, or surplus maths)

## Environment

- [x] `NEXT_PUBLIC_FINANCIAL_ENGINE_URL` documented in `.env.local.example`
- [x] URL read only in `lib/financial-engine/config.js`

## Manual golden path

With the engine running (`python run_server.py`) and sample form defaults:

1. Open `http://localhost:3000/farm-financials`
2. Click **Calculate annual financials**
3. Expect body `status: "ok"` and display:

| Metric | Reference |
|--------|-----------|
| Operating Income | 240000 |
| Schemes | 25000 |
| Operating Costs | 163000 |
| Operating Surplus | 77000 |
| Margin % | 32.08 |
| Loan repayments | 12000 |

## Status paths

| Scenario | Expected UI |
|----------|-------------|
| Omit required milk field | `needs_input` banner with missing field (+ unit) |
| Engine stopped | Unavailable banner |
| Engine `status: error` | Error banner using `error.code` |

## Formula-free guard

Search the frontend for calculation patterns before release. Allowed: presentation
formatting and label maps. Forbidden: deriving money totals in this repo.
