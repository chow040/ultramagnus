# Tech Spec: Assessment Memory & Material Change Detection Engine (Parallel Implementation)

## 1. Overview
This technical specification defines the implementation of the **Assessment Memory & Material Change Detection Engine** as a **new, parallel flow** within the **Ultramagnus** platform.

Instead of modifying the existing `aiAnalysisService.ts` directly, we will create a separate endpoint and service. This allows us to implement **LangChain**, **Memory**, and **Material Change Detection** safely without disrupting the current production flow.

The new flow will reuse the core prompt logic from the existing system but wrap it in a LangChain architecture to enable structured output and historical context injection.

## 2. Architecture

### 2.1 Integration Strategy
*   **New Endpoint**: `POST /ai/assessment-v2` (or `/ai/assessment-chain`).
*   **New Service**: `src/langchain/aiAssessment.ts`.
*   **Existing Prompt**: We will import or adapt the `REPORT_PROMPT` from `src/services/aiAnalysisService.ts`.
*   **Database**: Use existing `reports` table for memory storage.

### 2.2 Data Flow
1.  **Trigger**: Client calls the new endpoint `POST /ai/assessment-v2` with a `ticker`.
2.  **Context Retrieval**:
    *   Fetch **Previous Report** with assessment (from `reports` table).
    *   (Financials are fetched via Google Search Grounding or Finnhub, consistent with the prompt).
3.  **LangChain Execution**:
    *   Construct the prompt: `Base Prompt` + `Memory Context`.
    *   Invoke `ChatGoogleGenerativeAI` with `JsonOutputParser`.
4.  **Material Change Detection**:
    *   Compare `new_assessment` vs `previous_assessment`.
    *   Flag "Material Changes" (Rating flip, Valuation swing > 10%).
5.  **Persistence**:
    *   Save the full report (including `aiAssessment`) to `reports` table.
    *   Return the result.

## 3. Database Schema

We will leverage the existing `reports` table to store assessment history. No new tables are needed.

### Memory Retrieval Query
```typescript
// Get the most recent report with aiAssessment for a ticker
const getLatestAssessment = async (ticker: string) => {
  const result = await db.select()
    .from(reports)
    .where(eq(reports.ticker, ticker))
    .orderBy(desc(reports.createdAt)) // Latest report first
    .limit(1);
  
  // Return the aiAssessment from the most recent report, or null if none exists
  return result[0]?.payload?.aiAssessment || null;
};
```

## 4. Service Implementation (`src/langchain/aiAssessment.ts`)

We will create a new service file that encapsulates the LangChain logic.

### 4.1 Prompt Adaptation
We will take the `REPORT_PROMPT` from `aiAnalysisService.ts` and wrap it in a `ChatPromptTemplate`.

**Template Structure:**
```text
{base_prompt}

### Memory Context
You previously assessed this stock. Here is your **Previous Assessment**:
{previous_assessment_json}

### Instructions for Consistency
1.  **Consistency**: Compare current data with your Previous Assessment.
    *   If fundamentals are unchanged, maintain your thesis.
    *   If you change your rating or valuation method, you MUST explain why in the `history.changeRationale` field.
2.  **Output**: Return ONLY valid JSON matching the schema.
```

### 4.2 Chain Definition
```typescript
// src/langchain/aiAssessment.ts

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { REPORT_PROMPT } from "./aiAnalysisService"; // Reuse existing prompt text

export const runAssessmentChain = async (ticker: string, previousSnapshot: any) => {
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    temperature: 0,
  });

  const parser = new JsonOutputParser();

  const promptTemplate = ChatPromptTemplate.fromTemplate(`
    ${REPORT_PROMPT(ticker)}
    
    ### Memory Context
    You previously assessed this stock. Here is your **Previous Assessment**:
    {previous_assessment_json}
    
    ... [Additional Consistency Instructions] ...
  `);

  const chain = promptTemplate.pipe(model).pipe(parser);

  return await chain.invoke({
    previous_assessment_json: JSON.stringify(previousSnapshot || "None")
  });
};
```

## 5. Material Change Detection Logic

We will implement a **deterministic check** in the service layer.

**Logic:**
1.  **Rating Change**: If `prev.verdict` != `curr.verdict` -> **MATERIAL**.
2.  **Valuation Swing**: If `abs(curr.valuation.intrinsicValue - prev.valuation.intrinsicValue) / prev.valuation.intrinsicValue > 0.10` (10% swing) -> **MATERIAL**.

The final `is_material` flag stored in the DB will be:
`LLM_Reported_Material OR Deterministic_Material`

## 6. Implementation Plan

### Phase 1: Database
1.  No schema changes needed - use existing `reports` table.
2.  Implement helper function to query latest assessment by ticker.

**Checklist:**
- [x] Database: Implement `getLatestAssessment(ticker)` helper.

### Phase 2: New Service (`src/langchain/aiAssessment.ts`)
1.  Create `src/langchain/aiAssessment.ts`.
2.  Implement `getLatestAssessment(ticker)` using existing `reports` table.
3.  Implement `runAssessmentChain` using LangChain and the reused prompt.
4.  Implement `detectMaterialChange`.

**Checklist:**
- [x] Service: Create `src/langchain/aiAssessment.ts`.
- [x] LangChain: Implement Chain with reused Prompt + Memory.

### Phase 3: New Endpoint
1.  Create `src/routes/aiAssessment.ts`.
2.  Define `POST /ai/assessment-v2`.
3.  Wire it to `aiAssessment` service.

**Checklist:**
- [x] Endpoint: Create `POST /ai/assessment-v2`.

### Phase 4: Testing
1.  Call `POST /ai/assessment-v2` and verify it returns the same structure as the legacy endpoint.
2.  Verify Memory persistence and retrieval on subsequent calls.

**Checklist:**
- [ ] Testing: Verify parallel flow works.

