# Task List: Split `ai.ts` into AI analysis vs. AI chatbot routes

## Pre-flight
- [x] Inventory current handlers in `moonshot_be/src/routes/ai.ts` (`/chat`, `/chat/stream`, `/ai/stream-report`) and the shared helpers they rely on (`ensureClient`, `describeGenAiError`, `flushStreamingHeaders`, `streamText`, `REPORT_PROMPT`).
- [x] Confirm how the router is mounted in `moonshot_be/src/app.ts` so path prefixes stay identical after the split.

## Extract AI chatbot routes
- [x] Create `moonshot_be/src/routes/aiChat.ts` exporting a router with `/chat` and `/chat/stream`, preserving auth requirements and logging structure.
- [x] Decide whether chatbot-specific helpers (history normalization, context/system text builders) stay inline or move to a shared util to avoid duplication between chat and analysis.
- [x] Update imports (conversation service, auth middleware, logger) to the new file and remove them from the original once moved.

## Extract AI analysis/report generation
- [x] Create `moonshot_be/src/routes/aiAnalysis.ts` exporting a router with `/ai/stream-report` and the report prompt.
- [x] Move streaming helpers and GenAI error/ensure-client helpers here or to a shared `aiShared.ts` to keep duplicated logic minimal.
- [x] Preserve existing behavior: streaming headers, googleSearch tool config, logging, and failure handling with `logAIFailure`.

## Wire-up and cleanup
- [x] In `moonshot_be/src/app.ts`, import and mount the two new routers so existing endpoints remain unchanged for clients.
- [x] Delete or slim down the original `ai.ts` once routes are relocated; if shared helpers remain, convert it into a small shared module.
- [x] Update any local imports referencing `ai.ts` (if any) to the new files.

## Docs and specs
- [x] Refresh references in specs (`docs/AI conversion persistance/report-conversation-history-tech-spec.md`, `docs/AI data streaming/streaming-tech-spec.md`) that currently mention `src/routes/ai.ts` to point to the new file structure.

## Validation
- [ ] Run backend tests/build (e.g., `npm run test` or `npm run build` in `moonshot_be`) and hit `/api/ai/stream-report`, `/api/chat`, and `/api/chat/stream` to confirm responses and streaming behavior still work.
