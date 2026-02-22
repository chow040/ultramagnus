# AI Assessment Provider Toggle (Gemini ↔ OpenAI) — Tech Spec

## Goal
Allow switching the legacy AI assessment flow between Gemini and OpenAI (with browser/web search tool) via configuration, and expose the selected provider as a toggle in the Account Settings page so users can choose their preferred model (where permitted).

## Scope
- Backend: make the legacy assessment `/api/ai/stream-report` provider-selectable at runtime.
- Frontend: surface a user-facing toggle in Account Settings; persist the choice per user (or feature-flag/admin-only if required).
- Persistence: continue saving generated reports to DB under the authenticated user.

## Constraints
- Keep existing endpoints and response shapes for backward compatibility.
- Preserve report saving and auth requirements on `/api/ai/stream-report`.
- Avoid breaking LangChain `/api/ai/assessment-v2`.

## Design
### Backend
- Config: `AI_ANALYSIS_PROVIDER` (`gemini` default, `openai`), `OPENAI_API_KEY`, `OPENAI_MODEL` (e.g., `gpt-4.1`), reuse existing Gemini envs.
- Provider selector: in `aiShared` (or new module), export a typed provider enum, model name, and a `getClient()` that returns either Google GenAI or OpenAI client based on config or per-request override.
- Service: in `runGeminiAnalysis` (rename to `runAnalysis`), branch on provider:
  - Gemini path: current logic with `tools: [{ googleSearch: {} }]`.
  - OpenAI path: call `responses.create` with `tools: [{ type: 'browser' }]`, `temperature: 0`, then reuse `sanitizeJsonText`/`parseReportJson`.
- Routing: keep `/api/ai/stream-report`, require auth, call `runAnalysis`, persist via `createReport`, return `reportId`.
- Optional per-user override: accept a provider hint in the request body (validated/authorized); otherwise fall back to server config.

### Frontend
- Account Settings page: add a select/toggle for “AI Assessment Model” with options (e.g., Gemini, OpenAI).
- Persist selection:
  - Preferred: save to user profile (new column/field) via an existing profile endpoint or a small `/api/profile` extension.
  - Interim: store in local storage and send with the request body (`provider`), while honoring server defaults if missing.
- Job creation: when calling `/api/ai/stream-report`, include selected provider if allowed. Keep LangChain path untouched.
- UX: show current provider, warn if unavailable (e.g., missing key); disable option if backend does not advertise support.

### Data Model
- Add optional `preferred_assessment_provider` to user profile table/model.
- Expose in profile API responses so FE can prefill the toggle.

### Compatibility
- If provider is unsupported/misconfigured, backend should reject with 400 and an explicit error; FE falls back to default and shows a toast.

## Development Checklist
- **Phase 0 — Enablement & Config**
  - [ ] Add envs: `AI_ANALYSIS_PROVIDER`, `OPENAI_MODEL`, `OPENAI_API_KEY`; update `config/env.ts`.
  - [ ] Implement provider enum and `getClient` that returns Gemini or OpenAI.
  - [ ] Add supported-providers discovery (config endpoint or static array) for the FE.
- **Phase 1 — Backend Wiring**
  - [ ] Refactor service to `runAnalysis` with provider branching; add OpenAI browser-tool call; reuse JSON parsing/normalization.
  - [ ] Keep `/api/ai/stream-report` auth + save; accept optional provider hint (validated).
  - [ ] Tag logs/metrics with provider (`ai.report.completed`, save events).
- **Phase 2 — Data Model/API**
  - [ ] Add `preferred_assessment_provider` to user profile model/table.
  - [ ] Expose/accept it in profile GET/PUT (or dedicated endpoint).
- **Phase 3 — Frontend UI/Behavior**
  - [ ] Add Account Settings toggle/select for “AI Assessment Model” (Gemini/OpenAI), showing only supported options.
  - [ ] Persist selection via profile API; fallback to local storage if API unavailable.
  - [ ] Include provider in assessment requests when set; default to backend config otherwise.
- **Phase 4 — Testing**
  - [ ] Unit test provider selection and parsing; mock both providers.
  - [ ] Smoke test end-to-end (e.g., NVDA, AAPL) for both providers; verify report save and `reportId` returned.
- **Phase 5 — Rollout**
  - [ ] Deploy with Gemini default; set envs; build + restart (`pm2 restart moonshot-be`).
  - [ ] Stage OpenAI option; internal/admin-only toggle; monitor logs/metrics per provider.
  - [ ] Gradual enablement for all users once stable.

## Rollout Plan
- Default to Gemini in prod.
- Enable OpenAI option behind config/flag; stage/test NVDA/AAPL runs.
- Expose toggle to internal/admin users first; then to all users once stable.
