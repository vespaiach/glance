# Glance

Family wall-calendar web app. Spec: docs/product-spec.md (requirement IDs, e.g. TODAY-02). Design: docs/tech-design.md. Tasks: docs/execution-plan.md.

## Commands
npm ci · npm run dev · npm run check (biome) · npm run typecheck · npm test · npm run build

## Architecture
- Respect the dependency rules (tech-design §3). Biome enforces them.
- Screens never fetch or touch Dexie. They read via `data` hooks and write via repos (tech-design §4.2).
- Business rules are pure functions of (data, now, settings) in `src/domain`. Time comes only from `useNow()` or an injected `now`, never `new Date()` in components.
- Never store derived values (event status, counts, pending, hero state). Compute them.
- Multi-state flows (sign-in, upload tile, weather setup, sync status) are a discriminated union + a reducer.
- Every data zone renders through `ZoneState<T>` + `<Zone>` (loading / empty / ready / failed) with its own error boundary (LOAD-*, FAIL-*, OFF-*).
- Services and the sync worker return `Result<T, ErrorCode>`. A 401 never drops outbox entries (tech-design §5).
- Server services take `accountId` first and scope every query and write by it. Exceptions: `server/auth` before a session exists, and `server/jobs`, which run across accounts.
- Route Handlers only resolve the session (`requireDisplay`, plus the `Origin` check on writes), validate with Valibot, call a service and map its `Result` to HTTP (tech-design §6.1). They never touch the database.
- All user-facing text comes from `src/copy.ts`.
- Styling is StyleX only, with tokens from `src/theme`. No inline `style`, CSS modules or Tailwind.

## Code style
- No comments in `src/`. Names, types and test titles carry the meaning. Allowed: `// biome-ignore <rule>: <reason>`, `// @ts-expect-error <reason>` and triple-slash directives.
- Write function bodies as short steps (guards → each read or write → build the result), separated by one blank line, with no blank lines inside a statement. Extract a step into a named function when it has a clear name and at most two inputs, even if it's used once. A function with one or two steps stays one block.
- Order each file top-down: imports, types and constants, exported functions, then private helper functions. Write helpers as `function` declarations so they can sit below their callers.

## Building UI (bottom up)
1. Pure component in `src/ui` or `src/features/*/components`: props in, callbacks out, local UI state only (open, focus, draft).
2. Show it in `/dev/gallery` in all four seasons and every state `Glance States` shows. Components built before the gallery (F11) are added in F11.
3. Features only: compose it into the screen layout and compare with `Glance States` and the screen's side page (`Glance Today Layout`, `Glance Notice Board`, …) at the three sizes: large 1920×1080, normal 1024×768, small 390×844.
4. Features only: connect it last. `src/features/*/XScreen.tsx` reads `data` hooks and `useNow()` and passes plain props down.

## Testing (TDD)
- Applies to `src/domain`, reducers, repos, the sync engine, server services and component behavior (clicks, validation, ARIA). Styling and layout are checked in the gallery and against `Glance States` and the side pages, not in tests.
- Each server service that touches account data has a test proving another account's rows can't be read or written.
- Test names start with the spec ID (`TPK-07 rejects an end before the start`), or the tech-design ID when there is none (`D10 …`, `tech§5 …`).
- Order, no steps skipped:
  1. List the planned tests (name, what it asserts, ID).
  2. Write and run them. Confirm each fails for the expected reason.
  3. Write the minimum code to pass, then refactor while green.
- A task with no testable behavior (scaffold, config, docs, pure styling) says so at the start and skips steps 1–2.

## Workflow
One task = one branch + one PR, named with the task ID. Follow the plan's "Status tracking" rules.
1. **Start:** `git fetch origin`, confirm the task's dependencies are ✅ on `origin/main`, then `git switch -c feat/<ID>-<slug> origin/main`. Never branch from a local `main` or another task's branch. Open a draft PR; its first commit sets the task row to 🔄 with the PR link.
2. **Docs:** in the same PR, behavior changes go to product-spec.md, and decisions, schema, API or structure go to tech-design.md (bump the version). Fix any plan row the change makes wrong.
3. **Checks:** run `npm run check` → `npm run typecheck` → `npm test` → `npm run build` and fix every failure.
4. **Ready:** when all pass and no owner approval is pending, merge in the latest `origin/main`, push and mark the PR ready without being asked.
5. **Done:** the last commit before merge sets the row to ✅. Done means merged to `main`.

## Don't
- Add a global state library (Dexie is the store), generic base classes, or e2e tests.
