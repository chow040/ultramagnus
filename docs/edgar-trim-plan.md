# EDGAR Trim Plan (LLM-Friendly Financials)

## Goal
Trim EDGAR companyfacts into a compact, LLM-friendly payload that still supports full financial analysis and modeling, while retaining raw data for audit/debug.

## What to Keep (per frame)
- P&L: Revenue/Sales, COGS, Gross Profit, OpEx (R&D, SG&A), Operating Income, Interest/Non-op (if present), Income Tax, Net Income, EPS (diluted, fallback basic).
- Cash Flow: CFO, CapEx, FCF (CFO − CapEx), CFI total, CFF total, major financing flows (debt issued/repayed, buybacks, dividends), cash change.
- Balance Sheet: Cash, Marketable Securities (current/noncurrent), Receivables, Inventory, Other Current Assets, Total Current Assets, Total Assets, Payables, Current Debt, Other Current Liabilities, Total Current Liabilities, Long-Term Debt, Total Liabilities, Equity, Accumulated OCI.
- Extras (optional but useful): Shares outstanding/basic-weighted shares; lease liabilities/assets (operating + finance); deferred tax assets/liabilities.

## What to Drop
- Non-USD units.
- Restated duplicates (keep latest by `end` per tag+frame).
- Narrative/string facts.
- Highly granular items (purchase obligations detail, tax recon detail, OCI breakdown) unless explicitly needed.
- Frames beyond window: keep last 4–8 quarters + last 2 FYs for trend/modeling.

## Output Shape (per frame)
```json
{
  "frame": "CY2024Q2",
  "start": "2024-03-31",
  "end": "2024-06-29",
  "pl": {...},   // P&L core fields
  "bs": {...},   // Balance sheet core fields
  "cf": {...},   // Cash flow core fields (include FCF)
  "metadata": {"form": "10-Q", "accn": "..."}
}
```
- Apply scale (10^scale) to numeric values.
- Provide derived margins optionally (gross/op/net) but always include raw numerics.

## Tag Selection Rules
- Deterministic primary→fallback lists per the tech spec (revenue, cogs, gross profit, op income, net income, EPS, cash, debt, equity, etc.).
- Keep only USD; if no USD, consider alternative units cautiously or drop.
- For each tag+frame, choose latest fact by `end` (restatement handling).

## Token Control
- Limit per-frame tags to the core list above; if offering a “facts index”, cap at ~150 tags/frame to avoid bloating prompts.
- Limit frames (quarters/FYs) to modeling window to keep payload small.

## Raw Data Retention
- Store full companyfacts JSON to disk/cache for audit/debug.
- Expose trimmed facts index (tag → value) only when needed; default to core structured payload above.

## Steps to Implement
1) Extend mapper to emit:
   - `QuarterFinancial[]` (curated).
   - `frames[]` with `pl/bs/cf` core fields, derived FCF, optional margins.
   - Optional `factsIndex` (USD tag→value) with tag count cap.
2) Add frame/window limits (last 4–8 quarters, last 2 FYs).
3) Add restatement logic: pick latest `end` per tag+frame.
4) Apply scale normalization; drop non-USD unless no USD exists.
5) Write tests covering trimming, frame selection, and tag fallback selection.
