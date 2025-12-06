# Intrinsic Valuation PRD

## Background
Users want a clear intrinsic value for each analyzed stock (DCF + market multiples) with transparent assumptions and margin-of-safety guidance. Today we only show AI-generated narratives and price targets; we do not compute intrinsic value from fundamentals or expose tunable levers.

## Goals
- Deliver an intrinsic value per share for any saved report ticker using factual financials (from a third-party provider such as Finnhub or FMP).
- Surface a concise valuation card in the report view with margin-of-safety guidance.
- Allow users to tweak core assumptions (growth, margin, discount rate, terminal growth/exit multiple) and get instant recalculation.
- Provide cross-checks vs peer multiples to anchor the DCF output.

## Non-Goals
- Building a full-blown portfolio optimizer or position sizing engine.
- Supporting bespoke accounting adjustments beyond basic normalization (e.g., capitalizing R&D).

## Users & Scenarios
- Long-term investor: wants a quick intrinsic value and MOS to sanity-check a buy.
- Analyst comparing peers: wants to see DCF vs EV/EBITDA/P/E implied prices for context.
- Power user: wants to nudge assumptions (growth, discount rate) and see sensitivity.

## User Experience (summary)
- Report view gains an “Intrinsic Value” section (card or tab):
  - Shows: Intrinsic value per share, upside/downside vs current price, margin-of-safety label, DCF vs multiples range, key assumptions.
  - Includes small “Assumptions” control (modal/drawer) with sliders/inputs for: 5Y revenue CAGR, target operating margin/FCF margin, WACC/discount rate, terminal growth or exit EV/EBITDA multiple, share dilution toggle (use basic share count growth).
  - Sensitivity chips (optional): quick presets (Base, Cautious, Optimistic).
  - On adjust → recompute in-place (fast; can stream or single response).

## Functional Requirements
1) Compute intrinsic value
   - DCF: 5-year projection + terminal value (Gordon growth) OR exit multiple option; discount via WACC.
   - Multiples cross-check: EV/EBITDA and/or P/E peer median → implied equity value/share.
   - Output: intrinsicDCF, intrinsicMultiples (low/med/high), blendedIntrinsic (optional), marginOfSafety %, verdict (BUY/HOLD/SELL bands).
2) Data ingestion
   - Pull financials and market data from provider (Finnhub/FMP): income statement, cash flow (FCF), balance sheet (cash, debt), shares outstanding, beta, price.
   - Peer set: sector/industry peers from provider; fetch key multiples.
   - Cache results per ticker with TTL to respect rate limits.
3) Assumptions model
   - Defaults: revenue CAGR (based on trailing + fade), FCF margin (use TTM or sector median), WACC (risk-free + beta*ERP, plus small-size premium option), terminal growth capped (e.g., ≤3%).
   - User inputs override defaults; validate ranges; fall back gracefully if data missing (show “insufficient data”).
4) API
   - `POST /api/valuation/:ticker` (auth required).
   - Request body: optional overrides { growth, fcfMargin, wacc, terminalGrowth, exitMultiple, useExitMultiple, sharesOverride }.
   - Response: { intrinsicDCF, intrinsicRange, mosPct, verdict, assumptionsUsed, inputsUsed (financials snapshot), multiplesSummary, sensitivities[] }.
5) UI
   - Add valuation card to report view; show current price vs intrinsic, MOS badge, brief rationale.
   - “Edit assumptions” opens modal; submit triggers recompute.
   - Handle loading/error states; if data incomplete, show actionable message (e.g., “Not enough cash flow history; showing multiples only”).
6) Logging & analytics
   - Log valuation requests (ticker, source, overrides, success/fail, latency).
   - Capture provider errors with code/status for ops.

## Data & Assumptions
- Financial fields: revenue, EBITDA/EBIT, net income, CFO, capex, FCF (CFO - capex), cash, debt, shares, beta, price.
- Derived: net debt, WACC (risk-free from config; ERP constant), EV, peer median multiples.
- Sensitivities: small grid on (growth, WACC, terminal g) to produce low/base/high bounds.

## Constraints & Edge Cases
- Missing data: fall back to multiples-only; mark DCF unavailable.
- Negative or volatile FCF: switch to EBITDA-based exit multiple path with conservative margin ramp.
- Rate limits: cache, dedupe concurrent requests, backoff on provider errors.
- Currency consistency: ensure provider returns currency; keep outputs in listing currency.

## Dependencies
- Third-party data provider (Finnhub/FMP) credentials and quotas.
- Frontend: Report view component (valuation card, modal), API client.
- Backend: new valuation service + route; optional cache (in-memory ok initially).

## Success Metrics
- Feature usage: % of report views that open valuation card and adjust assumptions.
- Latency: <1.5s p95 for valuation recompute with warm cache.
- Data coverage: % of tickers with successful DCF; fallback rate.
- Decision clarity: % sessions with MOS verdict surfaced (instrumentation).

## Risks
- Data gaps/quality from provider → mitigate with fallbacks and clear messaging.
- Overconfidence from single-point estimates → mitigate by showing ranges and MOS bands.
- Latency under rate limits → use caching and peer-median shortcuts when needed.

## Rollout Plan
- Phase 1: Backend valuation endpoint (with mock provider adapter), FE card using mock data.
- Phase 2: Wire real provider, caching, error handling; add assumptions modal.
- Phase 3: Add sensitivities and peer multiples cross-check; polish UX and metrics.
