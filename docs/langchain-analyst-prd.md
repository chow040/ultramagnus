# LangChain Analyst Migration PRD & Fundamental Assessment UI

## 1. Goal
- Safely migrate AI Analyst generation from the legacy Gemini prompt route to a LangGraph-based implementation with a clear cut-over path.
- Add a dedicated UI section that surfaces the fundamental analyst assessment derived from the LangGraph output, without breaking existing report views.

## 2. Scope
- Backend: New LangGraph workflow (already implemented) exposed via a separate route/flag; keep legacy route intact until cut-over.
- Frontend: Add a "Fundamental Analyst Assessment" section to the report detail page, consuming the LangGraph payload when available.
- Observability: Per-route/model logging to compare legacy vs LangGraph outputs and token costs.
- Out of scope: Changes to upstream data providers; non-equity assets.

## 3. Users & Value
- Equity analysts and power users: get more reliable, structured reports with faster iteration on prompt/graph changes.
- Product teams: dual-run capability to compare legacy vs LangGraph outputs before switching; reduced regression risk.
- Business: lower token waste by trimming prompts and isolating retries, with visibility into model usage.

## 4. Requirements
- **Dual-path toggle**: Feature flag (`LANGCHAIN_ANALYST_ENABLED`) controls exposure of LangGraph route `/api/ai/stream-report/langgraph`; legacy `/api/ai/stream-report` remains untouched.
- **Response contract**:
  - Legacy: existing streaming JSON blob (unchanged).
  - LangGraph: newline-delimited JSON events; last event contains the full `report`.
  - Frontend must detect which path was used and parse accordingly; ignore partial events if schema not final.
- **Fundamental Assessment UI**:
  - **Design Philosophy (Dieter Rams Style)**:
    - **Less, but better**: Remove all non-essential decoration. Focus strictly on the data and the narrative.
    - **Honest**: Do not manipulate the user with "flashy" score animations. Present the `verdict` and `scores` clearly and objectively.
    - **Unobtrusive**: The UI should be a quiet container for the analysis. Use a strict grid system, neutral typography (Inter/Helvetica), and high-contrast black/white for structure. Use color *only* for semantic meaning (Green/Red for Buy/Sell or Scores).
    - **Understandable**: Group related metrics logically (e.g., "Valuation" separate from "Risk").
  - **Key Fields to Display**:
    - **Recommendation**: `fundamentalAnalysis.recommendation.rating` (BUY/HOLD/SELL) + `fundamentalAnalysis.recommendation.rationale`.
    - **Valuation**:
      - **Intrinsic Value**: `fundamentalAnalysis.valuation.intrinsicValue` (vs `currentPrice`).
      - **Upside**: `fundamentalAnalysis.valuation.upsidePct`%.
      - **Method**: `fundamentalAnalysis.method` (e.g., "PE Multiple").
      - **Inputs**: Table of `fundamentalAnalysis.valuation.inputs` (Name, Value, Unit, Note).
    - **Thesis**: `fundamentalAnalysis.thesis.bullets` (Bulleted list of key drivers).
    - **Risks**: `fundamentalAnalysis.risks` (Bulleted list of key risks).
  - **Layout**:
    - Top: Recommendation & Intrinsic Value (The "Verdict").
    - Middle: Thesis & Valuation Inputs (The "Why").
    - Bottom: Risks (The "Counter-argument").
  - Graceful fallback: if LangGraph data missing, hide the section or show legacy summary card.
- **Observability**:
  - Log per-call: route (`legacy|langgraph`), model, userId (if available), ticker, duration, prompt text length (estimate), and stream success/failure.
  - Capture token estimates client-side or via model metadata if available; otherwise log prompt length + completion length.

## 5. Non-Functional
- Backward compatibility: legacy route behavior unchanged; flag defaults to off in production until verified.
- Performance: LangGraph streaming first event within 2s; full report within existing timeout budgets.
- Security: API key stays server-side; no client exposure. Keep feature flag server-controlled.
- Resilience: If LangGraph fails mid-stream, return 502 and allow client retry on legacy.

## 6. Success Metrics
- Dual-run coverage: % of report requests that exercise LangGraph in staging without user-facing errors.
- Output parity: Manual/automated diff pass rate between legacy and LangGraph reports for a sample ticker set.
- Token efficiency: Avg prompt length and total tokens per report decrease vs baseline.
- UI engagement: Users view the new Fundamental Assessment section without increased error reports.

## 7. Rollout Plan
- Stage 1 (Staging only): Enable flag, dual-run internal testing; compare outputs and tokens.
- Stage 2 (Limited prod): Enable flag for internal users; keep legacy as default UI source; log both.
- Stage 3 (Cut-over): Switch UI to LangGraph payload; keep legacy route as fallback for 1 week.
- Stage 4 (Cleanup): Remove legacy path references once stable.

## 8. Frontend Notes
- Parsing: For LangGraph, consume last newline-delimited JSON event as the final report.
- UI placement: Insert "Fundamental Analyst Assessment" near the top of the report page under the main summary.
- States: loading (streaming), ready (render fields), fallback (legacy summary), error (retry CTA).

## 9. Risks & Mitigations
- Parsing errors on streamed events → Only render final event; add try/catch around JSON parse.
- Token bloat → Keep schema/prompt trimmed; log prompt lengths; cap financials to essential fields.
- Mixed model usage → Log model name per call; enforce config to `gemini-2.5-flash` for analyst.

## 10. Open Questions
- Do we need side-by-side diff view for legacy vs LangGraph for QA?
- Should the assessment card be visible to all users or gated to internal/beta?
- Do we expose partial progress updates in the UI or keep a simple loader?
