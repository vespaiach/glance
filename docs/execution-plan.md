# Glance — Execution Plan

| | |
|---|---|
| Version | v4.5 |
| Date | 2026-10-28 |
| Inputs | [`product-spec.md`](product-spec.md) (v1.14) · [`tech-design.md`](tech-design.md) (v3.06) · design handoff v18 (`Kiosk display mockups.zip`, 2026-10-26) |
| Checks | `npm run check` → `npm run typecheck` → `npm test` → `npm run build` |

The backlog of open work. `/dooo` runs it top to bottom: it takes the first ⬜ row whose dependencies are ✅, does it in one PR, merges it and moves on until every row is ✅.

## Status tracking

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🔄 In progress ([#n](#)) | Work has started on its branch. Links the task's PR |
| ✅ Done ([#n](#)) | The task's PR is **merged to the default branch** |

**Rules**
- **Order** is the row order of the Tasks table. Put a task below everything it needs.
- A task is PR-sized (about 0.5–2 days of work), starts with a bold short title (`**Login form**: …`), and has a **Done when** check that can be verified (a test, a command, a page that matches a design).
- **IDs** are a letter and two digits (`A01`), one letter per batch of work. Never reuse an ID. Every letter A–Z is used, so a new batch reuses a letter and continues after its highest number (this batch: K, from K37).
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file, or `—`. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled `<ID>: <title>`. The PR's first commit sets the row to 🔄; its last commit before merge sets it to ✅. A closed, unmerged PR resets the row to ⬜.
- **Checks** (header) must all pass locally before the PR is marked ready, and CI (if the repo has any) must be green before merge.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates the spec and/or tech design in the same PR and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| K37 | ✅ ([#184](https://github.com/vespaiach/glance/pull/184)) | **Docs and code consistency**: a review of the code against the docs. Code: TODAY-06 Coming up reads every live event after today and applies the person filter before it takes 5 (was: 5 for everyone, filtered after); the event and tag write schemas cap title 140, place 60, notes 280 and tag name 32 characters (§7, EVT-12), like the client fields; `GET /api/sync` renews the `session` cookie (400 days), so a screen in use never signs itself out. Docs: tech design and README follow the code (stale versions, `sign_in_codes` columns, build-check and 426 routes, `revoked`, `server/push`, `photos.files_removed`, `RepoStore`, `glance-meta`, shell parts, function names, MiB); the plan drops the done K33–K36 rows; the stray `src/` comment goes | — | Tests: `TODAY-06` a filtered Coming up still shows a matching plan past the first 5 events; `EVT-12` and `tech§6.1` the write schemas reject a title of 141, a place of 61, notes of 281 and a tag name of 33 characters and accept the limits; `tech§6.2` the sync pull answers with a renewed `session` cookie; all Checks pass | TODAY-06, EVT-12, §7, §1.2 |
