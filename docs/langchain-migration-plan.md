# LangChain Migration Plan: AI Analyst

Reference: `AGENT.md` (project baseline) and `docs/langchain-tech-spec.md`.

## 1. Overview
This document outlines the plan to migrate the existing "AI Analyst" logic from the raw `@google/genai` implementation in `moonshot_be/src/routes/aiAnalysis.ts` to a structured LangChain architecture within `moonshot_be/src/langchain/analyst/`.

## 2. Objectives
*   **Decouple Logic**: Separate prompt management, model interaction, and data fetching from the HTTP route handler.
*   **Enhance Orchestration**: Use LangChain's **pipelines** (chains) or `Agent` classes for better control over the analysis workflow.
*   **Maintain Compatibility**: Ensure the output JSON structure remains identical to support the existing frontend.
*   **Streaming Execution**: The entire process must stream data to the client to avoid Vercel server timeouts.
*   **Safe Migration**: Use a feature flag to toggle between the legacy and new implementations.

## 3. Architecture

### 3.1 Directory Structure (`moonshot_be/src/langchain/analyst/`)
*   `marketAnalyst.ts`: The initial agent that performs a broad market assessment using the existing prompt and search capabilities. Contains the `Report` type definition and the **prompt definition**.
*   `equityAnalyst.ts`: The secondary agent that takes the `marketAnalyst` output, fetches hard financial data, and performs a deep-dive equity evaluation to refine the report.

### 3.2 Data Flow
1.  **Input**: Ticker symbol (string).
2.  **Step 1: Market Assessment (`marketAnalyst`)**:
    *   Run `marketAnalyst` with the legacy prompt (converted to LangChain).
    *   Model uses Google Search (if available) to gather news, sentiment, and broad data.
    *   **Output**: Draft `Report` JSON.
3.  **Step 2: Equity Evaluation (`equityAnalyst`)**:
    *   Input: Draft `Report` + Ticker.
    *   **Context Gathering**: Fetch structured financial data (last 4 quarters) using `tools/financialDataTool.ts`.
    *   **Refinement**: `equityAnalyst` reviews the draft report against the hard financial data.
    *   **Update**: Recalculate scores (Rocket, Financial Health) and validate claims.
4.  **Return**: Final Refined `Report` object.

## 4. Implementation Plan

### Phase 1: Foundation & Types
1.  **Extract Types**: Analyze `REPORT_PROMPT` in `aiAnalysis.ts` and create strict TypeScript interfaces directly in `src/langchain/analyst/marketAnalyst.ts`.
2.  **Port Prompt**: Move the prompt text to `src/langchain/analyst/marketAnalyst.ts` as a **simple constant**.

### Phase 2: Analyst Implementation
1.  **Implement `client.ts`**:
    *   Implement `getLLMClient` to return a configured `ChatGoogleGenerativeAI` (or similar) instance.
    *   Ensure API keys are loaded from environment variables.
2.  **Implement `marketAnalyst.ts`**:
    *   Import `getLLMClient` from `../client.ts`.
    *   Construct the **processing pipeline** (chain) that connects the prompt to the model.
    *   **Grounding**: Configure the model to use Gemini's built-in Google Search by passing `tools: [{ googleSearch: {} }]` (supported by `@langchain/google-genai`).
    *   Use the existing "AI Analyst" prompt to generate the initial JSON report.
3.  **Implement `equityAnalyst.ts`**:
    *   Create a new prompt that instructs the model to "Review and Refine" the provided report using the provided financial data.
    *   Use `tools/financialDataTool.ts` to fetch actual data.
    *   Construct a chain that takes `{ ticker, draftReport }` as input and outputs the final `Report`.
4.  **Orchestration**:
    *   In `marketAnalyst.ts` (or a new `index.ts`), export the main `generateEquityReport` function.
    *   This function should be a **generator** or return a **stream** that yields chunks from `marketAnalyst` and then `equityAnalyst` to ensure the client receives data immediately.

### Phase 3: Integration
1.  **Feature Flag**: Add `LANGCHAIN_ANALYST_ENABLED` to `src/config/appConfig.ts` (default `false`).
2.  **Route Update**: Modify `src/routes/aiAnalysis.ts`:
    *   Import `generateEquityReport` from `../langchain/analyst/marketAnalyst.ts`.
    *   Add a conditional check for the feature flag.
    *   If enabled, await the LangChain result and stream/send it.
    *   **Streaming**: **CRITICAL**. To prevent Vercel server timeouts, the response **must be streamed**. The orchestration function should yield chunks (e.g., progress updates or partial tokens) to keep the HTTP connection alive throughout the multi-step process.

### Phase 4: Verification
1.  **Unit Test**: Create `scripts/test-langchain-analyst.ts` to run the analyst in isolation.
2.  **Comparison**: Run both implementations for the same ticker and compare the JSON structure and data quality.

## 5. Checklist

- [ ] **Scaffolding**
    - [ ] Create `src/langchain/analyst/marketAnalyst.ts` (types, prompt, initial chain).
    - [ ] Create `src/langchain/analyst/equityAnalyst.ts` (refinement prompt, financial tool integration).

- [ ] **Implementation**
    - [ ] Define `Report` interface in `marketAnalyst.ts`.
    - [ ] Implement `marketAnalyst` chain (Legacy Prompt -> JSON).
    - [ ] Implement `equityAnalyst` chain (Draft JSON + Financials -> Final JSON).
    - [ ] Wire up `financialDataTool` in `equityAnalyst`.
    - [ ] Chain them together in `generateEquityReport`.

- [ ] **Integration**
    - [ ] Add `LANGCHAIN_ANALYST_ENABLED` env var/config.
    - [ ] Update `POST /ai/stream-report` to use the new flow when enabled.

- [ ] **Testing**
    - [ ] Verify JSON output validity.
    - [ ] Verify error handling (e.g., invalid ticker).
