# Product Requirements Document (PRD)

## Product Title

Assessment Memory & Material Change Detection Engine

## Version

v1.0

## Owner

Product / Trading Intelligence Platform

## Background & Problem Statement

Users may run multiple assessments on the same security within short or long intervals. Without historical context, the AI may:

* Produce inconsistent verdicts (e.g., BUY → HOLD within minutes)
* Fail to explain *why* an assessment changed
* Reduce user trust due to lack of auditability and thesis continuity

Professional investors expect analyst-like behavior:

* Stable views absent new information
* Explicit explanation of material changes
* Clear change logs showing thesis evolution over time

This PRD defines a system to persist prior assessments (“memory”), retrieve them on subsequent runs, and deterministically evaluate whether changes are *material*.

---

## Goals & Objectives

### Primary Goals

* Persist structured assessment history per ticker
* Compare current vs prior assessment
* Determine whether changes are *material*
* Generate a clear, user-facing change log

### Non-Goals

* Automatic trade execution
* Model fine-tuning or RL
* Predictive accuracy benchmarking

---

## Users & Personas

### Primary User

* Professional / semi-professional investor
* Expects analyst-grade consistency and explanations

### Secondary User

* Admin / system operator
* Needs auditability and prompt/version traceability

---

## User Stories

1. As a user, when I rerun an assessment, I want to see whether anything materially changed since the last report.
2. As a user, I want to understand *why* the verdict or target price changed.
3. As a user, I want confidence that reruns with unchanged evidence will not arbitrarily change conclusions.
4. As an admin, I want to audit historical assessments and understand prompt or data-driven differences.

---

## Functional Requirements

### 1. Assessment Snapshot Persistence

Each completed assessment MUST be stored as a structured snapshot

Snapshots MUST be immutable once written.

---

### 2. Previous Assessment Retrieval

On each new assessment request, the system MUST:

* Retrieve the most recent prior snapshot for the same ticker
* Optionally retrieve the most recent snapshot with a *different* `evidence_hash`

If no prior snapshot exists, the system MUST mark the assessment as **First Coverage**.

---

### 3. Current Assessment Generation

The system generates the current assessment using the standard assessment chain and stores it as a new snapshot.

Constraints:

* Default temperature = 0
* Output MUST conform to the snapshot schema

---

### 4. Material Change Comparator

A dedicated comparison step MUST run when a prior snapshot exists.

#### Comparator Inputs

* Previous snapshot
* Current snapshot

#### Comparator Outputs

* `material_change` (boolean)
* `materiality_level` (none / low / medium / high)
* `what_changed` (bullets)
* `why_it_matters` (bullets)
* `verdict_change` (boolean)
* `target_price_change_pct` (numeric, optional)
* `consistency_flag` (true if verdict/TP changed but evidence_hash unchanged)
* `change_log_text` (UI-ready text)

---

### 5. Materiality Rules

#### Deterministic Rules (Hard Constraints)

A change is automatically **material** if any of the following are true:

* Verdict changes (BUY ↔ HOLD ↔ SELL)
* Target price changes by ≥ configurable threshold (default: 8%)
* Time horizon changes
* Evidence hash changes AND key driver category changes

#### LLM-Based Qualitative Assessment

If deterministic rules are not triggered, the comparator MAY use an LLM to assess:

* Thesis integrity changes
* Risk profile changes
* Valuation anchor changes

The LLM MUST justify materiality in ≤ 3 bullets.

---

### 6. Consistency Guardrail (Any Rerun)

If `evidence_hash` is unchanged on a rerun (regardless of time elapsed), the system MUST:

* Reuse prior verdict and target price, OR
* Require explicit justification for changes

If violated, set `consistency_flag = true`.

---

### 7. User Interface Requirements

#### Assessment View

Display:

* Current verdict and summary
* **Change Log Section** (if prior exists)

Example:

> Previous verdict: BUY (Aug 2025) → Now: HOLD
>
> What changed:
>
> * Management guidance reduced FY revenue growth
> * Valuation multiple compressed vs peers

#### First Coverage

If no prior snapshot exists:

* Display label: **First Coverage**
