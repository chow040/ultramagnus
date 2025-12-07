# LangChain Migration Plan: AI Analyst

Reference: `AGENT.md` (project baseline) and `docs/langchain-tech-spec.md`.

## 1. Overview
This document outlines the plan to migrate the existing "AI Analyst" logic from the raw `@google/genai` implementation in `moonshot_be/src/routes/aiAnalysis.ts` to a structured LangChain architecture within `moonshot_be/src/langchain/analyst/`.

## 2. Objectives
*   **Decouple Logic**: Separate prompt management, model interaction, and data fetching from the HTTP route handler.
*   **Enhance Orchestration**: Use **LangGraph** to manage the state and workflow between multiple specialized agents.
*   **Maintain Compatibility**: Ensure the output JSON structure remains identical to support the existing frontend.
*   **Streaming Execution**: The entire process must stream data to the client to avoid Vercel server timeouts.
*   **Safe Migration**: Use a feature flag to toggle between the legacy and new implementations.

## 3. Architecture

### 3.1 Directory Structure (`moonshot_be/src/langchain/analyst/`)
*   `graph.ts`: Defines the LangGraph `StateGraph`, the `AgentState` interface, and the main entry point `runAnalystGraph`.
*   `nodes/marketAnalyst.ts`: The node that performs broad market assessment using Google Search.
*   `nodes/equityAnalyst.ts`: The node that refines the report using hard financial data.
*   `tools/financialDataTool.ts`: A tool to fetch structured financial data.

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
2.  **Extract Types**: Analyze `REPORT_PROMPT` in `aiAnalysis.ts` and create strict TypeScript interfaces in `src/langchain/analyst/types.ts`.
3.  **Port Prompt**: Move the prompt text to `src/langchain/analyst/prompts.ts`.

### Phase 2: Analyst Implementation
1.  **Implement `client.ts`**:
    *   Implement `getLLMClient` to return a configured `ChatGoogleGenerativeAI` instance.
2.  **Implement Nodes**:
    *   `marketAnalyst.ts`: A function that calls the LLM with search tools and returns the partial state update.
    *   `equityAnalyst.ts`: A function that takes the state, formats a "Review and Refine" prompt, and calls the LLM.
3.  **Implement Graph (`graph.ts`)**:
    *   Define `AgentState`.
    *   Initialize `StateGraph<AgentState>`.
    *   Add nodes and edges.
    *   Compile the graph.
4.  **Orchestration**:
    *   Export `generateEquityReport` which invokes the graph.
    *   **Streaming**: Use `graph.stream()` to yield events. This allows the frontend to see "Market Analysis Complete..." before the final JSON arrives.

### Phase 3: Integration
1.  **Feature Flag**: Add `LANGCHAIN_ANALYST_ENABLED` to `src/config/appConfig.ts`.
2.  **Route Update**: Modify `src/routes/aiAnalysis.ts`:
    *   Import `generateEquityReport`.
    *   If enabled, stream the graph events.
    *   **Streaming Response**: The route must handle the stream of graph events and send Server-Sent Events (SSE) or a streaming JSON response to the client.

### Phase 4: Verification
1.  **Unit Test**: Create `scripts/test-langchain-graph.ts`.
2.  **Comparison**: Run both implementations for the same ticker.

## 5. Checklist

- [ ] **Scaffolding**
    - [ ] Install `@langchain/langgraph`.
    - [ ] Create `src/langchain/analyst/types.ts` (Report interface).
    - [ ] Create `src/langchain/analyst/graph.ts` (State definition).

- [ ] **Nodes & Tools**
    - [ ] Implement `market_analyst` node.
    - [ ] Implement `fetch_financials` node (mocked initially or real).
    - [ ] Implement `equity_analyst` node.

- [ ] **Graph Assembly**
    - [ ] Wire nodes in `graph.ts`.
    - [ ] Verify `graph.stream()` output format.

- [ ] **Integration**
    - [ ] Update `POST /ai/stream-report` to consume the graph stream.

