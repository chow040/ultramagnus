# Rename Plan: `backend` ➜ `moonshot_be`, `moonshot` ➜ `moonshot_fe`

## Pre-flight
- [ ] Pause any running dev servers and close watchers before moving directories.
- [x] Confirm the working tree is clean or changes are stashed; note current branches for both apps.

## Backend rename (`backend` ➜ `moonshot_be`)
- [x] Move the folder and keep `dist`, `drizzle`, `logs`, and `.env*` files with it.
- [x] Update documentation references to the path: `AGENT.md` (section 2.2 and project tree), `docs/Logging/logging-system-status.md` (`moonshot_be/.env.example` mention), and any `cd moonshot_be` commands.
- [x] Adjust code comments/identifiers tied to the old name: `moonshot_be/src/utils/logger.ts` (log path comment), `moonshot_be/src/utils/bootstrapLogger.ts` and `moonshot_be/src/config/env.ts` (`SERVICE_NAME` default now `moonshot-be`).
- [x] Fix any scripts or tooling configs that hardcode `backend` as a relative path (npm scripts, Docker, CI if present).
- [x] Run `npm install`/`npm run build` inside `moonshot_be` to ensure tsconfig paths and Drizzle config still resolve.

## Frontend rename (`moonshot` ➜ `moonshot_fe`)
- [x] Move the folder and keep `dist`, `public`, `supabase`, and `.env.local` with it.
- [x] Update documentation references to the path: `AGENT.md` (section 2.1 and project tree) and `docs/Generative UI/generative-ui-tech-spec.md` (component path under `moonshot_fe/components`).
- [x] Align logging/telemetry identifiers with the new name if desired: `moonshot_fe/src/lib/logger.ts` currently emits `source: 'moonshot-fe'` (kept).
- [x] Fix any scripts or commands that `cd moonshot`, and update `package.json` metadata if you want the package name to match `moonshot_fe`.
- [x] Run `npm install`/`npm run build` inside `moonshot_fe` to confirm Vite aliases and imports still resolve.

## Cross-cutting cleanup
- [x] Search-and-replace residual legacy folder names (`backend` and `moonshot`) across docs, scripts, and config after the moves (historical log entries under `moonshot_be/logs/` still mention the old path and were left untouched).
- [x] Update screenshots/paths in `docs/Logging/logging-system-status.md` and any README snippets that reference the old directory names (no README references found).
- [x] If deployment scripts or PM2/systemd services exist, refresh their working directories and service names to match the new folders (none present).

## Validation
- [x] Run backend smoke tests (API happy-path via Postman/curl) and ensure logs write to `moonshot_be/logs` (GET /health returned 200; logs emitted under service `moonshot-be`).
- [x] Run frontend smoke test (e.g., `node scripts/playwright-login.js`) against the new build output (served `npm run preview` on :3000 and fetched index HTML successfully).
- [x] Verify FE/BE relative imports and supabase assets: no cross-folder relative imports found; supabase migrations unchanged in `/supabase` and frontend `supabase/schema.sql` still present in `moonshot_fe/`.
