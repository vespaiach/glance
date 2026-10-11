# Glance

Family wall-calendar web app. Spec: docs/product-spec.md (cite requirement IDs, e.g. TODAY-02). How it's built: docs/tech-design.md.

## Commands
npm ci · npm run dev · npm run check (biome) · npm run typecheck · npm test · npm run build

## Rules
- Screens never fetch or touch Dexie. Read via `data` hooks, write via repos (tech-design §4.2).
- Business rules are pure functions of (data, now, settings) in `src/domain`, with unit tests. Get time only from `useNow()` / an injected `now`, never `new Date()` in components.
- Never store derived values (event status, counts, pending, hero state). Compute them.
- Multi-state flows (sign-in, upload tile, weather setup, sync status) are discriminated unions + a reducer. A URL fixture param = the reducer's initial state.
- Every data zone renders through `ZoneState<T>` + `<Zone>` (loading / empty / ready / failed) and has its own error boundary (LOAD-*, FAIL-*, OFF-*).
- Services and the sync worker use `Result<T, ErrorCode>`. A 401 never drops outbox entries (tech-design §5).
- All user-facing text comes from `src/copy.ts`. Never inline strings.
- Styling is StyleX only: no inline `style`, CSS modules or Tailwind. Use tokens from `src/theme`.
- Respect the dependency rules (tech-design §3). Biome enforces them.

## Don't
- Add a global state library (Dexie is the store), generic base classes, or e2e tests.
