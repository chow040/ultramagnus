Below is the **entire PRD rewritten as a clean, self-contained Markdown file**.
You can copy this directly into `adaptive-financial-model-synthesizer.md` in your repo.

---

# 📘 Adaptive Financial Model Synthesizer (AFMS)

### *Product Requirements Document (PRD)*

### *TradingAgents v1.3 — Dec 2025*

---

## 1. Product Overview

### 1.1 Summary

The Adaptive Financial Model Synthesizer (AFMS) enables the system to **automatically determine the most appropriate financial valuation model for any stock**, generate the required numerical projections, and return a complete valuation output — including intrinsic value, sensitivity analysis, and reasoning.

This module plugs directly into the **LLM-Native TradingAgents architecture** and bridges the gap between traditional sell-side valuation practices and dynamic AI reasoning.

---

### 1.2 Problem Statement

Most valuation systems apply the same model (e.g., DCF) to every stock. This produces unreliable results because:

* Different sectors require different valuation methods
* Loss-making companies cannot use DCF reliably
* Banks/insurers require book-value and ROE-based models
* REITs require dividend models
* Conglomerates require Sum-of-the-Parts
* Cyclicals require mid-cycle normalisation

A robust system must automatically choose the correct model(s).

---

### 1.3 Goals

1. Dynamically determine the best valuation model(s) for each stock
2. Generate valuation results using structured templates
3. Provide human-grade financial reasoning
4. Output fair value ranges + confidence score
5. Integrate cleanly into TradingAgents’ decision pipeline

---

### 1.4 Non-Goals

* Trading execution logic
* Fetching raw market data
* Long-form research reports

---

## 2. User Personas

### 2.1 End User (Trader / Retail Investor)

* Wants accurate valuation
* Does not want to choose complex financial models manually
* Wants justification for AI selections

### 2.2 Internal User (TradingAgent Engine)

* Requires valuation JSON for prompts
* Needs structured deterministic output

### 2.3 Admin User

* Manages templates
* Adjusts weightings per model/sector
* Views system logs

---

## 3. High-Level Architecture

### 3.1 Pipeline Flow

1. **Input Layer**

   * Ticker
   * Financial statements
   * Sector classification
   * Business model attributes

2. **Model Selector Agent (MSA)**

   * Applies rules + LLM reasoning
   * Chooses appropriate valuation models
   * Outputs justification

3. **Model Template Engine**

   * Loads and fills out numerical templates
   * Performs valuation calculations

4. **Synthesis Engine**

   * Combines multiple model outputs
   * Generates final intrinsic value
   * Computes confidence score

5. **Return Layer**

   * JSON output for TradingAgents
   * Human-readable summary

---

## 4. Functional Requirements

## 4.1 Model Selector Agent (MSA)

### FR-1: Model Detection

The system must evaluate:

* Sector
* Profitability
* Cash flow stability
* Dividend pattern
* Capital structure
* Data availability
* Subsidiary materiality (SOTP detection)

### FR-2: Model Selection Output

Example structured JSON:

```json
{
  "selected_models": ["DCF", "EV/EBITDA"],
  "excluded_models": ["DDM", "SOTP"],
  "reasoning": "Stable cash flows, positive EBIT, no dividends, no conglomerate structure."
}
```

### FR-3: Weight Assignment

The system must assign weights to selected models:

```json
{
  "model_weights": {
    "DCF": 0.6,
    "EV/EBITDA": 0.4
  }
}
```

These may be auto-generated or overridden by admin.

---

## 4.2 Model Template Engine

### FR-4: Supported Valuation Models

| Model                | Use Case                      |
| -------------------- | ----------------------------- |
| DCF                  | Mature cash-flowing companies |
| DDM                  | Dividend-heavy stocks, REITs  |
| EV/EBITDA            | Industrials, cyclicals        |
| EV/Sales             | Early-stage tech, loss-making |
| Residual Income (RI) | Banks, insurers               |
| Price-to-Book        | Financials                    |
| SOTP                 | Conglomerates                 |
| NAV/RNAV             | Real estate developers        |
| Mid-cycle EBITDA     | Commodities, airlines         |
| Revenue Multiples    | High-growth SaaS              |

### FR-5: Template Format Stored in DB

```json
{
  "model": "DCF",
  "inputs": ["revenue", "ebit", "capex", "wacc", "terminal_growth"],
  "calculation_steps": [
    "FCF = EBIT*(1-tax) + Depreciation - Capex - ChangeInWC",
    "PV_FCF = discount(FCF, wacc)",
    "TerminalValue = FCF_last_year*(1+g)/(wacc-g)"
  ]
}
```

### FR-6: Auto-Fill Missing Data

If a required field is missing:

* Use industry medians
* Or fallback to simpler model (e.g., EV/Sales)

---

## 4.3 Synthesis Engine (Valuation Consolidation Layer)

### FR-7: Combine Valuation Outputs

Weighted average of selected models → final fair value.

### FR-8: Confidence Score

Score is based on:

* Stability of financials
* Model suitability
* Data completeness
* Volatility

### FR-9: Sensitivity Analysis

Output must include:

```json
{
  "fair_value_base": 112,
  "fair_value_range": {
    "bear": 95,
    "bull": 138
  },
  "confidence": 0.78
}
```

---

## 5. Data Requirements

### 5.1 Required Inputs

* 5-year financial statements
* Market cap, EV
* Multiples: P/E, EV/EBITDA, EV/Sales
* Sector / industry classification
* Dividend history
* Segment revenue breakdown (if available)

### 5.2 Derived Metrics

* Free cash flow
* WACC approximation
* ROE, ROTCE
* Book value, tangible book
* Interest coverage

---

## 6. System Integration

### 6.1 TradingAgent Prompt Integration

Valuation JSON is injected:

```json
{
  "valuation_summary": {
    "fair_value": 112,
    "confidence": 0.78,
    "models": ["DCF", "EV/EBITDA"]
  }
}
```

### 6.2 Database Schema

Tables:

* `valuation_runs`
* `valuation_models`
* `model_templates`
* `company_profiles`
* `valuation_cache`

---

## 7. Admin Console Requirements

### AR-1: Template Management

Admins can:

* Create
* Edit
* Enable / disable
* Version control

### AR-2: Override Model Weightings

Set defaults per:

* Sector
* Geography
* Profitability

### AR-3: View System Logs

Including:

* Model selection reasoning
* Calculation errors
* Missing data detection

---

## 8. UI/UX Requirements

### 8.1 Dashboard Components

* Selected valuation models
* Fair value gauge
* Sensitivity table
* Valuation range (bear/base/bull)
* Model selection reasoning
* Key financial highlights
* Downloadable valuation report (optional future feature)

### 8.2 User Flow

1. User enters ticker
2. System runs AFMS
3. Dashboard displays results
4. User may expand view to access model-specific assumptions

---

## 9. Technical Design Notes

### 9.1 Determinism

* Use temperature 0.2–0.4
* Structured prompts
* Tool-based numerical calculations

### 9.2 Error Handling

* Missing statements → fallback models
* Negative equity → avoid P/B
* Excessive volatility → widen sensitivity range

### 9.3 Performance Targets

* <3 seconds per valuation
* Support ≥ 100 concurrent valuation tasks

---

## 10. Acceptance Criteria

### AC-1

Correctly selects appropriate models for ≥90% of stocks across sectors.

### AC-2

Validated model selections for test stocks:

* AAPL → DCF, EV/EBIT
* JPM → RI, P/B
* PLTR → EV/Sales
* O (REIT) → DDM

### AC-3

Outputs must follow strict JSON schemas.

### AC-4

Deterministic output: <5% valuation deviation with same inputs.

### AC-5

All valuation runs must be logged in DB with audit trail.

---

## 11. Future Enhancements

* Reinforcement learning model to improve model selection
* AI-generated full equity research reports
* Monte Carlo valuation simulation
* Smarter peer multiple selection
* Sector-specific micro models (e.g., BDCs, miners, shipping, SaaS KPIs)

---

## 12. Appendix

### 12.1 Model Selection Rule Matrix

| Sector             | Recommended Models               |
| ------------------ | -------------------------------- |
| Tech (profitable)  | DCF, EV/EBIT                     |
| Tech (loss-making) | EV/Sales                         |
| SaaS               | Rule-of-40, EV/Gross Profit, DCF |
| Banks              | RI, P/BV                         |
| Insurers           | RI, P/BV                         |
| REITs              | DDM                              |
| Commodities        | Mid-cycle EBITDA                 |
| Airlines           | EV/EBITDA, mid-cycle EBITDAR     |
| Conglomerates      | SOTP                             |
| Real Estate Dev    | NAV/RNAV                         |

---