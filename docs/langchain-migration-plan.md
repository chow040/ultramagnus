# LangChain Migration Plan: AI Analyst

Reference: `AGENT.md` (project baseline) and `docs/langchain-tech-spec.md`.

## 1. Overview
This document outlines the plan to migrate the existing "AI Analyst" logic from the raw `@google/genai` implementation in `moonshot_be/src/routes/aiAnalysis.ts` to a structured LangChain architecture within `moonshot_be/src/analyst/`.

## 2. Objectives
*   **Decouple Logic**: Separate prompt management, model interaction, and data fetching from the HTTP route handler.
*   **Enhance Orchestration**: Use **LangGraph** to manage the state and workflow between multiple specialized agents.
*   **Maintain Compatibility**: Ensure the output JSON structure remains identical to support the existing frontend.
*   **Streaming Execution**: The entire process must stream data to the client to avoid Vercel server timeouts.
*   **Safe Migration**: Use a feature flag to toggle between the legacy and new implementations.

## 3. Architecture

### 3.1 Directory Structure (`moonshot_be/src/analyst/`)
*   `langgraph/analystWorkflow.ts`: Defines the LangGraph `StateGraph`, the `AgentState` interface, and the main entry point `runAnalystGraph`/`streamAnalystGraph`.
*   `langgraph/nodes/marketAnalyst.ts`: Drafts the report using Google Search; prompt and schema are defined inline.
*   `langgraph/nodes/fetchFinancials.ts`: Fetches hard financial data (last 4 quarters) via Finnhub tool.
*   `langgraph/nodes/equityAnalyst.ts`: Reviews/refines the draft against financials; prompt and schema are defined inline.
*   `langgraph/client.ts`: Analyst-specific LLM factory (Gemini, streaming enabled).
*   `types.ts`: Shared Analyst types (Report, AgentState).
*   `langchain/tools/financialDataTool.ts`: Fetches structured financial data (shared utility in the langchain root).

### 3.2 Data Flow (The Graph)
The workflow will be modeled as a state machine:

1.  **State**: `AgentState` contains:
    *   `ticker`: string
    *   `report`: Partial<Report> (The evolving report object)
    *   `financialData`: any (Raw data fetched for validation)
    *   `messages`: BaseMessage[] (For internal reasoning logs)

2.  **Nodes**:
    *   **`market_analyst`**:
        *   Input: `ticker`
        *   Action: Uses Google Search to generate the initial `draft_report`.
        *   Output: Updates `report` in state.
    *   **`fetch_financials`**:
        *   Input: `ticker`
        *   Action: Fetches hard data (last 4 quarters) via API.
        *   Output: Updates `financialData` in state.
    *   **`equity_analyst`**:
        *   Input: `report` (draft) + `financialData`
        *   Action: Reviews the draft against hard data. Recalculates scores.
        *   Output: Updates `report` (final).

3.  **Edges**:
    *   `START` -> `market_analyst`
    *   `market_analyst` -> `fetch_financials`
    *   `fetch_financials` -> `equity_analyst`
    *   `equity_analyst` -> `END`

## 4. Implementation Plan

### Phase 1: Foundation & Types
1.  **Install Dependencies**: Add `@langchain/langgraph`.
2.  **Extract Types**: Analyze `REPORT_PROMPT` in `aiAnalysis.ts` and create strict TypeScript interfaces in `src/analyst/types.ts`.
3.  **Port Prompt**: Inline prompts and shared JSON schema inside `src/analyst/langgraph/nodes/*`.

### Phase 2: Analyst Implementation
1.  **Implement `langgraph/client.ts`**:
    *   Provide `getAnalystLLM` returning a configured `ChatGoogleGenerativeAI` instance (streaming on, tuned temperature).
2.  **Implement Nodes**:
    *   `marketAnalyst.ts`: Calls the LLM with search tools and returns a partial state update (draft report).
    *   `equityAnalyst.ts`: Takes state + financials, formats a "Review and Refine" prompt, and returns the refined report.
    *   `fetchFinancials.ts`: Pulls recent quarters via the shared Finnhub tool.
3.  **Implement Graph (`langgraph/analystWorkflow.ts`)**:
    *   Define `AgentState`.
    *   Initialize `StateGraph<AgentState>`.
    *   Add nodes and edges.
    *   Compile the graph and expose run/stream helpers.
4.  **Orchestration**:
    *   Export `runAnalystGraph` / `streamAnalystGraph`.
    *   **Streaming**: Use `graph.stream()` to yield events so the client can surface progress before final JSON.

### Phase 3: Integration
1.  **Feature Flag**: Add `LANGCHAIN_ANALYST_ENABLED` to `src/config/appConfig.ts`.
2.  **Route Update**: Modify `src/routes/aiAnalysis.ts`:
    *   Import `runAnalystGraph`/`streamAnalystGraph`.
    *   If enabled, stream the graph events.
    *   **Streaming Response**: The route must handle the stream of graph events and send Server-Sent Events (SSE) or a streaming JSON response to the client.

### Phase 4: Verification
1.  **Unit Test**: Create `scripts/test-langchain-graph.ts`.
2.  **Comparison**: Run both implementations for the same ticker.

## 5. Checklist

- [ ] **Scaffolding**
    - [x] Install `@langchain/langgraph`.
    - [x] Create `src/analyst/types.ts` (Report interface).
    - [x] Create `src/analyst/langgraph/analystWorkflow.ts` (State definition).

- [ ] **Nodes & Tools**
    - [x] Implement `market_analyst` node (inline prompt/schema).
    - [x] Implement `fetch_financials` node (real Finnhub fetch).
    - [x] Implement `equity_analyst` node (inline prompt/schema).

- [ ] **Graph Assembly**
    - [x] Wire nodes in `langgraph/analystWorkflow.ts`.
    - [ ] Verify `graph.stream()` output format.

- [ ] **Integration**
    - [ ] Update `POST /ai/stream-report` to consume the graph stream.
