# Post-Login Smoothness Plan (Frontend UX)

## Goals
- Remove the landing → dashboard flash after Google sign-in.
- Avoid empty Report/Bookmark lists before data loads; show a loading state instead.

## Approach
1) **Auth bootstrapping**
   - Add a `bootstrapping` flag around the initial auth/session check.
   - If a stored user exists in `localStorage`, start `viewMode` as `DASHBOARD` (not `LANDING`).
   - Hide the main UI until bootstrapping completes; then render the appropriate view to prevent flicker.
2) **Dashboard loading state**
   - Use `isDashboardLoading` to render skeleton placeholders for the report library and bookmarks.
   - Keep current fetch logic (`listReports`/`listBookmarks`) but gate the empty states behind loading.
3) **Verification**
   - Validate locally: sign in, confirm no landing flash, and ensure skeletons show before data populates.
   - If local testing isn’t available, reason via code review and lightweight manual QA in Vercel preview.
