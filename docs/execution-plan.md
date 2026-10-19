# Glance — Execution Plan

| | |
|---|---|
| Status | v2.06 |
| Date | 2026-10-19 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.68) · [`tech-design.md`](tech-design.md) (v2.27) |

The backlog of open work. `/glance-next` (`scripts/glance-next.mjs`) runs it: it takes the first ⬜ task whose dependencies are ✅. Done tasks are removed at cleanup; their history is the merged PRs, each titled with its task ID.

## Status tracking

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🔄 In progress ([#n](#)) | Work has started. Links the task's PR |
| ✅ Done ([#n](#)) | The task's code is **merged to `main`** |

**Rules**
- A task is PR-sized (about 0.5–2 days), cites the requirement IDs it covers (**Covers**) and has a **Done when** check. Done also means CI green (`biome check → tsc → Vitest → next build`).
- **IDs** are a letter and two digits (`T05`), with a letter per batch of work. Never reuse an ID: letters used so far are A B C D E F G H I K L M N P Q R S T U V Y.
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled with the ID (`T05: …`). **Start:** `git fetch origin`, check its dependencies are ✅ on `origin/main`, branch from `origin/main`, open a draft PR; its first commit sets the row to 🔄. **Finish:** bring in the latest `origin/main`; the last commit before merge sets the row to ✅. A closed, unmerged PR resets it to ⬜.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates `product-spec.md` and/or `tech-design.md` in the same PR (bump the version) and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| D07 | ✅ ([#119](https://github.com/vespaiach/glance/pull/119)) | Design handoff v8 in the repo; spec v0.60, tech design v2.14 and this plan rewritten for family members, the day timeline, the Now panel, details sheets and the phone sidebar | — | The handoff matches the zip; spec, tech design and plan describe v8 | §2 |
| E01 | ✅ ([#120](https://github.com/vespaiach/glance/pull/120)) | Members entity: `007_members.sql` (members table, events `everyone`/`member_ids`/`notes`, `tone` dropped, one member per named account), `Member` schema, members service + `PUT/DELETE /api/members/{id}` (409 on a duplicate name), event `PUT` filters member ids (D24), first member on `POST /api/auth/name`, sync pull, Dexie v2 (`members`, event upgrade), `MembersRepo` + `useMembers`, `domain/members.ts`, `CLIENT_BUILD` bump; fixture family and events from Appendix A | D07 | Services, routes and repos pass with cross-account tests; an old event pulls as everyone; removing a member (one repo transaction) deletes solo plans and strips shared ones, offline too | D24, FAM-03, FAM-05, SYNC-01, §7 |
| G01 | ✅ ([#121](https://github.com/vespaiach/glance/pull/121)) | `domain/timeline.ts`: hour weights, passed-hour shrink, 24-hour night weights, pixel layout for a height, overlap columns with widening, minimum heights, label thinning, free slots, now marker; `hiddenOutsideSpan` count | D07 | Unit tests cover every TL rule with the Appendix A Oct 9 and Oct 10 days | TL-01..03, TL-06, TL-08, TL-09, CAL-06, D25 |
| A01 | ✅ ([#122](https://github.com/vespaiach/glance/pull/122)) | Sidebar hides when idle: `idle` action and a 15 s timer in AppShell, paused by an open sheet, the keyboard or a focused field | D07 | Reducer and AppShell tests: 15 s → Hidden, paused cases, the grip restarts it | SHELL-11, IDLE-01 |
| A02 | ✅ ([#123](https://github.com/vespaiach/glance/pull/123)) | Phone sidebar: 56 px rail, 44 px buttons, 4×56 Expand handle pill, 248 px drawer over the page with a 60% scrim (scrim tap → Rail); gallery and the Phone drawer board | D07 | Matches the Phone drawer board at 390×844; scrim tap → Rail; inset 0/56/56 on phone | SHELL-08, SHELL-10 |
| A03 | ✅ ([#124](https://github.com/vespaiach/glance/pull/124)) | PWA icons from `pwa-icons/` into `public/` with the manifest and `<head>` links; remove `SeasonVideo`, the AMB-09 code and the `videos` cache rule | D07 | Manifest lists the new icons; Ambient renders without the video; build and SW tests pass | §4.5 (tech), AMB-06 |
| E02 | ✅ ([#125](https://github.com/vespaiach/glance/pull/125)) | Event sheet: Who picker (Everyone + members, last one locked, defaults from the Calendar filter), Notes field; `AllDayTile` with person dot and "{who} · {place}" | E01 | Sheet tests for Who rules, Notes trimming and saving `everyone` vs member ids | EVT-02, EVT-11, TODAY-12 |
| E03 | ✅ ([#126](https://github.com/vespaiach/glance/pull/126)) | Event details sheet: color block, Happening now / Ended pills, Who/Where/Notes rows, Edit swap with Cancel/Save back to details, past events read-only; every event tap opens it | E02 | Reducer and sheet tests for details ↔ edit, discard to details, ended rules; `details=1` fixtures | EVT-07, EVT-09, EVT-10 |
| E04 | ✅ ([#127](https://github.com/vespaiach/glance/pull/127)) | Note details sheet: the sticky-note sheet, Edit swap to Edit note and back; Today and Notes taps open it | D07 | Reducer and sheet tests for details ↔ edit and discard; `sheet=note&details=1` | NOTE-01, NOTE-10, TODAY-09 |
| E05 | ✅ ([#128](https://github.com/vespaiach/glance/pull/128)) | Family sheet: member rows with plan counts, inline remove confirm with its impact line, add member with free colors and validation, discard on a typed name | E01 | Sheet tests for every FAM rule; `sheet=family`, `rm=`, `famname=`, `famerr=1` | FAM-01..06 |
| G02 | ✅ ([#129](https://github.com/vespaiach/glance/pull/129)) | `ui/DayTimeline`: measured card, plan cards with size tiers, colors and person dots, now marker, free-slot tiles, weather lane with rain chips, gutter weather; gallery in four seasons | G01, E01 | Component tests for plan and free-slot taps and names; gallery matches the Calendar and Today boards | TL-04, TL-05, TL-07, TL-10, TODAY-11 |
| G03 | ✅ ([#130](https://github.com/vespaiach/glance/pull/130)) | Calendar screen: week strip with dots and forecast, person filter with Edit (opens `{ kind: "family" }`; the filter is read through `liveFilter`), 24 hours with its badge, Add event for the filter, all-day tiles, timeline, empty states, `/calendar?date=`; remove `MonthGrid` | G02, E03, E05 | Screen tests for week stepping, filter rules, 24 hours and Add event defaults; matches the Calendar board at the six sizes | CAL-01, CAL-04..09 |
| G04 | ✅ ([#131](https://github.com/vespaiach/glance/pull/131)) | Phone date control and date picker modal | G03 | Picker tests for pick, Today and close; matches board frame B at 390×844 | CAL-02, CAL-03 |
| K01 | ✅ ([#132](https://github.com/vespaiach/glance/pull/132)) | Today Now panel: date + season icon + Clock, weather now with rain hour, event summary with countdown and who, several-running rule; `todayLayout` (stacked, portrait, twoColumn, threeColumn) with note limits; Picture of the day panel; header buttons at 1440 px; weather card removed | D07 | `todayHero` and `todayLayout` tests; matches the Today board at the six sizes | TODAY-01, TODAY-02, TODAY-04, TODAY-05, TODAY-07..10, TODAY-13 |
| K02 | 🔄 ([#133](https://github.com/vespaiach/glance/pull/133)) | Today schedule on `DayTimeline` (× 0.3, gutter weather, no filter); plan and all-day taps → Event details, free slot → New event; remove `useScheduleRows`, `todaySchedule`, `EventRow` and "See all" | K01, G02, E03 | Screen tests for the taps; matches the Today board with `events=many` | TODAY-03, TODAY-11, TODAY-12 |
