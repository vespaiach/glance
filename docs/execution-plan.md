# Glance — Execution Plan

| | |
|---|---|
| Status | v2.10 |
| Date | 2026-10-20 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.71) · [`tech-design.md`](tech-design.md) (v2.37) |

The backlog of open work. `/glance-next` (`scripts/glance-next.mjs`) runs it: it takes the first ⬜ task whose dependencies are ✅. Done tasks are removed at cleanup; their history is the merged PRs, each titled with its task ID.

## Status tracking

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🔄 In progress ([#n](#)) | Work has started. Links the task's PR |
| ✅ Done ([#n](#)) | The task's code is **merged to `main`** |

**Rules**
- A task is PR-sized (about 0.5–2 days), cites the requirement IDs it covers (**Covers**) and has a **Done when** check. Done also means the checks pass (`biome check → tsc → Vitest → next build`), run locally by `/glance-next` while GitHub CI is off.
- **IDs** are a letter and two digits (`T05`), with a letter per batch of work. Never reuse an ID: letters used so far are A B C D E F G H I K L M N P Q R S T U V W X Y Z.
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled with the ID (`T05: …`). **Start:** `git fetch origin`, check its dependencies are ✅ on `origin/main`, branch from `origin/main`, open a draft PR; its first commit sets the row to 🔄. **Finish:** bring in the latest `origin/main`; the last commit before merge sets the row to ✅. A closed, unmerged PR resets it to ⬜.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates `product-spec.md` and/or `tech-design.md` in the same PR (bump the version) and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| D09 | ✅ | Design handoff v10 in the repo (Account, Calendar, Behavior Notes, prototype, Glance Emails, `emails/sign-in-code.html` replacing `sign-in-link.html`); spec v0.71, tech design v2.34 and these rows | — | Docs merged | §2 |
| Z01 | ✅ | Sign-in codes on the server: `008_sign_in_codes.sql` (table; email rows and columns out of `magic_links`), `requestCode` / `verifyCode` services (hashed code, newest only, 10 min, 5 tries, constant-time compare), `POST /api/auth/code` and `POST /api/auth/code/verify` (limits, 400 `wrong-code` / `code-locked` / `code-expired`), `GET /api/auth/verify` and `status` for QR and sessions only, `link` route, `pending`/`link_email` cookies and polling removed; `signInMessage(to, code, season)` from `emails/sign-in-code.html`; code cleanup job; transport `auth.sendCode` / `verifyCode` | D09 | Service tests: right code signs in and creates a new account, wrong counts tries, 5th locks, expired and unknown read the same, a new send voids the old, another email's code never works; route tests for 429 and the error map; mailer tests for the code, escaping and season colors | SIGNIN-03, SIGNIN-08, SIGNIN-12, SIGNIN-17, tech§6.2, D11 |
| Z02 | ✅ | Sign-in screen for codes: `ui/CodeField`, reducer steps `sent` (code, `wrong`) / `checking` / `locked` / `expired`, auto-submit on the 6th digit, countdown hides both ghosts, offline on the code step; remove `phone`, waiting and polling, "Send a new link" and `on=link`; fixtures `signin=checking\|wrong\|locked`, `code=`; copy | Z01 | Reducer tests for every step and the 10 min expiry; component tests for paste "482 913", disabled Sign in under 6 digits, red cells cleared on the next digit, locked, offline never submits; matches Account boards D, L, N, O, P, H | SIGNIN-01, SIGNIN-03, SIGNIN-04, SIGNIN-08..10, SIGNIN-13, SIGNIN-16, SIGNIN-17 |
| Z03 | ✅ | Sign-in hero: date and time with the season icon (short date on phone), headline, the static preview (events tile, weather tile, sticky note; note placement wide vs narrow; hidden on phone); no Clock | Z02 | Gallery in four seasons; matches the Account board at the six sizes (styling only, no tests) | SIGNIN-01 |
| Z04 | ✅ | Members → tags: `009_tags.sql`, `Tag` schema, `/api/tags/{id}` PUT only (409 on rename/recolor or a taken name), events `tagIds` and nobody allowed, sync entity `tags`, Dexie v3, `TagsRepo` + `useTags`, `domain/tags.ts`; delete `features/family`, the `family` sheet, the Edit pill, member DELETE and the removal transaction; new filter rules, color-filled name pills and `who=none`; `CLIENT_BUILD` bump | Z01 | Service and route tests with a cross-account test; an old event pulls with `tagIds`; Dexie upgrade test; `matchesFilter` / `toggleFilter` / `liveFilter` tests for every CAL-05 rule incl. nobody plans; matches Calendar A at the six sizes | D24, FAM-05, FAM-07, CAL-05, CAL-07, SYNC-01, §7 |
| Z05 | ⬜ | Who tag field: `domain/tagMatch.ts` `suggestTags`, the field with pills and ✕, inline input, suggestions, Enter and Backspace rules, the New member tile with swatches writing through `TagsRepo`, `whoValue` saving everyone; Event details Who rows | Z04 | Unit tests for each match tier, folding and the typo rule; sheet tests for add, remove, Backspace, exact-name Enter, Add member, nobody, everyone; matches Calendar C on large display and phone | EVT-11, FAM-04, FAM-05, EVT-09 |
| Z06 | ⬜ | Calendar timeline: drop the weather lane, gutter hour weather on Calendar at every size, rain chips off on phone, the 24 hours text link with "· {n} more plans" and the 24-hour clock label; remove the toggle pill and badge | Z04 | Component tests for the link labels and toggle; matches Calendar A at the six sizes with `span=24` | CAL-06, TL-07, TODAY-11, §5.4 |
| Z07 | ⬜ | Sheets: sticky header and footer with shadows and the soft body in `ui/Sheet` (white tiles inside); `ui/Switch`; the All day row with disabled struck-through fields; day forecast after the eyebrow in event sheets and Event details | Z05 | Switch and All day tests (row tap, picker closes, error clears, times restored); `dayForecast` tests; gallery and the Calendar board | §8.9, EVT-01, EVT-02, EVT-08 |
| Z08 | ⬜ | Settings values: `idleTimeout { on, minutes }`, `noteExpiry { on, days }`, `hideSidebarWhenIdle`; `010_settings_values.sql`, Dexie v4, defaults, `noteExpired` and the note job by days, `IdleProvider` by minutes, `useHideWhenIdle` at 20 s behind the setting; NOTE-06/07 captions; `CLIENT_BUILD` bump | Z04 | Migration and Dexie upgrade tests map every old value; job and `noteExpired` tests for 1 and 30 days and off; idle tests for off and minutes; AppShell test: setting off never hides | SET-07, NOTE-06..08, IDLE-01, SHELL-11, §7 |
| Z09 | ⬜ | Settings UI: `ui/Radio`, `ui/Slider`; the Season radio list with icons, Clock and Temperature radios, Hide sidebar when idle switch, the Back to Today and Remove notes switch + slider tiles (off keeps the value) | Z07, Z08 | Component tests for radio keys, switch writes and the kept value; gallery in four seasons; matches the Settings board at the six sizes | SET-02, SET-04, SET-05, SET-07, A11Y-02 |
