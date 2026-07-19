# Drishti — Frontend

React PWA for the Drishti risk engine.

**What we built:** A deterministic causal risk engine with 7 weighted components (Cash Runway, DSCR, Income Stability, Seasonal Position, Input Cost Pressure, Recovery Quality, External Risk), 50+ configurable rulebook rules across 4 categories, 5 sector profiles (Dairy, Rural Retail, Poultry, MGNREGA, Agriculture), 9 demo enterprises with causally-linked synthetic data, DPI signal simulation (UPI velocity, NACH bounce, MGNREGA demand, mandi prices) with convergence detection, savings floor analysis, 5-layer household debt tracking, peer-relative context, actionable suggestions, and a 6-month cash flow forecast — all running entirely in-browser with zero backend. Built for NABARD's 479 DDMs who need to see 63 million enterprises they can't visit.

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` (dev) or `http://localhost:5173/app/` (production-like).

## Build

```bash
npm run build
```

Output: `dist/` — landing page at `/`, React app at `/app/`.

## Lint

```bash
npm run lint
```

## Tech Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4 (class-based dark mode)
- Dexie.js (IndexedDB) — offline-first
- Zustand (state)
- Recharts (charts)
- vite-plugin-pwa (Workbox)

## Project Structure

```
src/
├── config/rulebook/          # 50+ rules, 5 sector profiles, evaluator, validator
├── data/
│   ├── db.ts                 # Dexie.js layer (6 tables)
│   └── mockData.ts           # 9 demo enterprises with causal shock histories
├── lib/
│   ├── risk-engine.ts        # Core: 7-component scoring + forecasting + DPI + savings floor + suggestions + peer context
│   └── i18n.ts               # Hindi/English translations (89 keys × 2 locales)
├── store/index.ts            # Zustand state
├── components/
│   ├── enterprise/           # Mobile: EnterpriseView + DataEntryForm
│   ├── dashboard/            # Desktop: DDMView (gallery grid, drill-down, DPI signals)
│   └── shared/               # ModelMetricsCard, VoiceInput, RiskBadge
└── types/index.ts            # Enterprise, CashFlow, Risk, Forecast, DPISignal types
```

## Risk Engine Pipeline

1. `seedMockData()` — 12-month cash flow histories with causal shocks per sector
2. `calculateRisk()` — 7-component rulebook scoring with mutual exclusion, sector weights, convergence, dampening
3. `forecastCashFlow()` — 6-month projection with seasonal multipliers + confidence bands
4. Phase 2 — savings floor, peer context, actionable suggestions via cross-enterprise data
5. `simulateDPISignals()` — UPI/NACH/MGNREGA/Mandi signals with convergence detection
