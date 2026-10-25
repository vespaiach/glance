# Glance — Execution Plan

| | |
|---|---|
| Version | v4.1 |
| Date | 2026-10-25 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.95) · [`tech-design.md`](tech-design.md) (v2.94) · design handoff v17 (`Kiosk display mockups.zip`, 2026-10-25 18:01) |
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
- **IDs** are a letter and two digits (`A01`), one letter per batch of work. Never reuse an ID. Every letter A–Z is used, so a new batch reuses a letter and continues after its highest number (this batch: K, from K26).
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file, or `—`. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled `<ID>: <title>`. The PR's first commit sets the row to 🔄; its last commit before merge sets it to ✅. A closed, unmerged PR resets the row to ⬜.
- **Checks** (header) must all pass locally before the PR is marked ready, and CI (if the repo has any) must be green before merge.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates the spec and/or tech design in the same PR and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

Handoff v17 changes five files against v16: `Glance.dc.html`, `Glance Notes`, `Glance States - Settings` (new frame R, `rmmember=`), `Glance Guide` and `Glance Terms of Service`. It adds two things: a **Remove a member** card in Settings and a **Back to Glance** pill in the Guide and Terms headers. Size checks are against `Glance States - Settings` R and the mockup URL `view=settings&rmmember={key}`, at large 1920×1080, normal 1024×768 and small 390×844. Requirement IDs marked *new* are created by K26.

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| K26 | ✅ ([#170](https://github.com/vespaiach/glance/pull/170)) | **Design handoff v17 in the repo**: copy the zip's `design_handoff_glance/` over `docs/design/handoff/`. Spec: §1 out of scope keeps only "renaming or recoloring tags"; §7 Tags and FAM-07 say a tag can be removed from Settings (never renamed or recolored); new FAM-08 **Remove a member** (the Settings card from Glance Notes: eyebrow "Family · {n} members", rows with color circle, name, mono "{n} plans" / "No plans", secondary "Remove" (`trash-2`, aria-label "Remove {name}"); two taps: the first swaps the count for the result line and shows ghost "Cancel" + red "Remove {name}" (one row asks at a time), the second removes at once; the last member has no Remove and the card says "The last member can't be removed."); SET-16 *new* for the card's place (right column, between Schedule and Account); CAL-05: removing the only selected person resets the filter to everyone; GUIDE-01 and TERMS-01 headers end with the black "Back to Glance" pill (`arrow-left`, 44 px min) → `/` (sign-in when signed out, Today when signed in). Tech design: D24 gets `DELETE /api/tags/{id}` (soft delete; the server, in one transaction, soft-deletes the events whose only tag it is and drops it from other events' `tag_ids`, one version bump each; 409 `last-tag` when it is the last live tag), the tags repo `remove`, and the outbox `tag` delete. **Decided** (where the Notes leave gaps; write into the spec): (1) "plans" counts live events, past ones too, that name the tag in `tagIds`; everyone events are not counted and do not change. (2) The cascade runs on the server; the screen applies the same rule locally in the same Dexie transaction as the tag delete (one outbox entry, no per-event entries), and the next pull overwrites it with the server's rows. (3) A removed member's name can be added again from the Who picker as a new tag (the unique index only covers live tags). (4) Removing works offline (queued like any write); the last-member guard is checked on the screen and on the server | — | Docs merged; versions bumped; the decisions recorded in the spec; every row below still matches the spec it cites | §1, §7, FAM-07, FAM-08 *new*, SET-16 *new*, CAL-05, GUIDE-01, TERMS-01 |
| K27 | ✅ ([#171](https://github.com/vespaiach/glance/pull/171)) | **Back to Glance on Guide and Terms**: the black pill "Back to Glance" (`arrow-left` 18 px, 44 px min height, 20 px sides, 17 / 480) at the end of the `/guide` header (after the FAQ link) and the `/terms` header (next to "Source on GitHub", wrapping on small), linking to `/` in the same tab. Text from `src/copy.ts`, StyleX tokens | K26 | Guide and Terms page tests: the link is named "Back to Glance" and points to `/`; matches `Glance Guide` and `Glance Terms of Service` headers at the three sizes | GUIDE-01, TERMS-01 |
| K28 | 🔄 | **Remove a tag (data)**: pure `memberRemoval(events, tagId)` in `domain/tags.ts` → the ids to delete (only that tag) and to strip (shared), and the FAM-08 result line from it; `liveFilter` resets to `"all"` when a removal empties an explicit selection. Server: `removeTag(accountId, id)` service (soft delete + cascade in one `tx`, versions bumped, `Result` with `last-tag` and `not-found`), `DELETE /api/tags/{id}` (`requireDisplay`, `Origin` check, maps the `Result`). Client: tags repo `remove(id)` applying `memberRemoval` locally with one outbox entry; the sync engine pushes it and a 401 keeps it. `CLIENT_BUILD` bump | K26 | Domain tests (only-tag, shared, everyone untouched, past counted, result line wording); service tests incl. cascade, last tag refused, another account's tag and events untouched; route tests (401, bad Origin, 409); repo test (local cascade + one outbox entry); engine test (push, 401 keeps the entry); filter reset test | FAM-08, CAL-05, D24 |
| K29 | ⬜ | **Remove a member card**: pure `MemberList` in `src/features/settings/components` (props: members with color, name, counts and result line; asking id; callbacks), rows as FAM-08 (40 px circle, name 17 / 540 with ellipsis, mono count, Remove with `shadow-1`; asking row: result text, right-aligned wrapping ghost Cancel + danger-filled "Remove {name}"; hairline between rows; "The last member can't be removed." with one member). Gallery in four seasons: idle, asking (only-tag, shared, no plans), one member, at the three sizes. Settings screen places it between Schedule and Account and wires it to the tags hook, events hook and `remove` (local asking state; only one row asks) | K28 | Component tests: first tap asks and shows the result line, Cancel returns, second tap calls remove once, only one row asks at a time, no Remove with one member, aria-labels; Settings screen test: removing deletes the member's only events and drops them from shared ones; matches `Glance States - Settings` R and `view=settings&rmmember=…` at the three sizes | FAM-08, SET-16 |
