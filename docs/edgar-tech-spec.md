# EDGAR Financials Ingestion Tech Spec

## Goal
Build a standalone EDGAR (SEC) financials interface that produces `QuarterFinancial[]` compatible outputs. Do **not** wire it into LangGraph in this PR (integration will be a separate PRD).

## Scope
- Backend (moonshot_be) only: new EDGAR client, mapper utility, config flags, and tests.
- Output shape matches `QuarterFinancial[]` for future reuse; optionally expose full raw EDGAR facts alongside the mapped summary.
- No wiring into LangGraph nodes or routes in this spec.
- No schema changes or new persistence. No frontend changes.

## Non-Goals
- Real-time filing alerts.
- Historical bulk backfill beyond the requested recent quarters.
- UI updates.

## Current State (per agents.md)
- Agent pipeline: `marketAnalystNode` → `fetchFinancialsNode` → `equityAnalystNode`.
- Financials source today: Finnhub via `fetchRecentQuarterFinancials` in `langchain/tools/financialDataTool.ts`, returning `QuarterFinancial[]`.
- No EDGAR integration exists; no ticker→CIK resolution utilities.

## Proposed Architecture
- Feature flag `EDGAR_ENABLED` (env) gates the EDGAR client usage (for future integrations).
- New client `src/clients/edgar.ts`
  - Fetch helpers with required `User-Agent` and contact headers.
  - Throttle to ≤10 req/sec; simple retry with jitter on 429/5xx.
  - Endpoints: `companyfacts` (financial facts), `submissions` (recent filings metadata), `company_tickers.json` (ticker→CIK map; cached in memory).
- New mapper `src/langchain/tools/edgarFinancials.ts`
  - `fetchRecentQuarterFinancialsEdgar(ticker, periods=4)` → `QuarterFinancial[]` plus optional raw facts passthrough.
  - Steps: resolve CIK → pull companyfacts → pick USD frames → map tag aliases → compute per-quarter `year`/`quarter`.
  - Buckets: income (revenue, cogs, grossProfit, operatingIncome, netIncome, eps), balance (cash, totalDebt, shareholderEquity), cashflow (operatingCashFlow, capex, freeCashFlow=CFO-CapEx).
  - Handles missing frames gracefully (nulls), avoids fabricating data.
  - Optional: return `rawFacts` (filtered to numeric USD facts per frame) so LLMs can see the full data, not just curated fields.
- Logging: structured events `edgar.request.*`, `edgar.financials.parsed`, `edgar.financials.empty`.

## Data Mapping Details
- Mapping covers common statement fields for `QuarterFinancial` while preserving the option to surface full facts:
- Source tags (primary→fallback):
  - Revenue: `Revenues`, `SalesRevenueNet`
  - COGS: `CostOfRevenue`, `CostOfGoodsAndServicesSold`, `CostOfSales`
  - Gross Profit: `GrossProfit`, `GrossProfitLoss`
  - Operating Income: `OperatingIncomeLoss`; fallback (only if operating missing) `IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest`
  - Net Income: `NetIncomeLoss`
  - EPS: `EarningsPerShareDiluted`, `EarningsPerShareBasicAndDiluted`, `EarningsPerShareBasic`
  - Cash: `CashAndCashEquivalentsAtCarryingValue`, `CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents`
  - Total Debt: sum of (`LongTermDebtNoncurrent` or `LongTermDebtAndCapitalLeaseObligations` or `DebtNoncurrent`) + (`DebtCurrent` or `LongTermDebtCurrent` or `LongTermDebtCurrentPortion`); if no components, look for `DebtAndCapitalLeaseObligations`
  - Shareholder Equity: `StockholdersEquity`
  - Current Assets: `AssetsCurrent`; Total Assets: `Assets`
  - Current Liabilities: `LiabilitiesCurrent`; Total Liabilities: `Liabilities`
  - Operating Cash Flow: `NetCashProvidedByUsedInOperatingActivities`, `NetCashProvidedByUsedInOperatingActivitiesContinuingOperations`
  - CapEx: `PaymentsToAcquirePropertyPlantAndEquipment`, `PurchaseOfPropertyPlantAndEquipment`, `PaymentsToAcquireProductiveAssets`
- Frame parsing: prefer USD unit, scale 1; frames like `CY2023Q2` → `year=2023`, `quarter=2`.
- Scale handling: if `scale` present, multiply by 10^scale; avoid non-USD unless nothing else exists.
- Restatements: if multiple frames for the same quarter, pick the latest by `end` date.
- Full facts option: keep all USD numeric facts per frame in `rawFacts` (keyed by tag → array of {value, start, end, frame, accn, form}), so LLMs can access additional line items beyond the curated fields.

## Data Availability & Trimming Assessment
- Goal: understand what EDGAR provides per ticker and decide what to keep vs. drop for LLM context efficiency.
- How to assess:
  - Pull `companyfacts` for 3–5 representative tickers (mega-cap, mid-cap, small-cap) and inventory tags:
    - Count tags per namespace (`us-gaap`, `dei`, others) and per unit (USD vs. non-USD).
    - For each tag, count frames by frequency (Q vs. FY) and recency.
    - Identify duplicate/restated frames and scale values.
  - Build a sample “facts index” per frame: tag → latest USD value, with scale applied.
  - Measure size: raw JSON size vs. trimmed facts index vs. curated `QuarterFinancial` to estimate LLM token impact.
- Trimming strategy:
  - Keep: USD numeric facts with valid frame dates; latest per tag+frame; scale-normalized.
  - Drop: non-USD unless no USD exists, narrative/string facts, superseded restatements, duplicated frames, units with scale ambiguity when USD is available.
  - Optional include: store full `companyfacts` on disk/cache for audit/debug; expose only trimmed facts to the model.
- Output options:
  - Curated `QuarterFinancial[]` for core metrics.
  - Optional `rawFacts` (trimmed facts index per frame) for richer LLM context without full bloat.

## Error Handling & Resilience
- Missing env (`EDGAR_USER_AGENT`, `EDGAR_CONTACT`) when enabled → startup error.
- 429/5xx → retry with backoff; still return Finnhub fallback if EDGAR fails.
- Partial quarters: include entry with nulls rather than drop the quarter.

## Testing Strategy
- Unit tests for:
  - Frame parsing (CY…Qn to year/quarter).
  - Tag alias resolution and value selection.
  - FCF computation (CFO - CapEx).
  - Retry/throttle logic (mock fetch).
- Fixtures: trimmed `companyfacts` samples for 1–2 tickers under `test/fixtures/edgar/`.
- Integration smoke: EDGAR enabled with mocked fetch to fixture; ensure `fetchFinancialsNode` returns `QuarterFinancial[]`.

## Rollout
- Phase 1: Ship EDGAR client + mapper behind `EDGAR_ENABLED`; expose for internal consumption (not wired).
- Phase 2 (future PRD): Wire into LangGraph/other services with fallback logic.
- Phase 3 (optional): Add caching layer (in-memory TTL) for ticker map and companyfacts to reduce calls.

## Risks & Mitigations
- Tag variability across filers → alias list and null defaults.
- Rate limits/429 → throttle + backoff.
- Data gaps per quarter → null fields, no fabrication.
- Unit mismatches (thousands/millions) → prefer scale=1; otherwise adjust by `scale` when present.

## Implementation Checklist
- Frontend (start here even if N/A)
  - [ ] No UI changes required; confirm no API surface changes.
- Backend
  - [ ] Add env keys (`EDGAR_ENABLED`, `EDGAR_USER_AGENT`, `EDGAR_CONTACT`) to config and samples.
  - [ ] Implement `clients/edgar.ts` with headers, throttle, retries, and ticker→CIK lookup cache.
  - [ ] Implement `langchain/tools/edgarFinancials.ts` mapper returning `QuarterFinancial[]` and optional `rawFacts`.
  - [ ] Export client/mapper for future integrations (no LangGraph wiring in this PR).
  - [ ] Add tests + fixtures for mapper and client behaviors.
