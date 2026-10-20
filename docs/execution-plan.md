# Glance — Execution Plan

| | |
|---|---|
| Status | v2.07 |
| Date | 2026-10-20 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.69) · [`tech-design.md`](tech-design.md) (v2.29) |

The backlog of open work. `/glance-next` (`scripts/glance-next.mjs`) runs it: it takes the first ⬜ task whose dependencies are ✅. Done tasks are removed at cleanup; their history is the merged PRs, each titled with its task ID.

## Status tracking

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🔄 In progress ([#n](#)) | Work has started. Links the task's PR |
| ✅ Done ([#n](#)) | The task's code is **merged to `main`** |

**Rules**
- A task is PR-sized (about 0.5–2 days), cites the requirement IDs it covers (**Covers**) and has a **Done when** check. Done also means CI green (`biome check → tsc → Vitest → next build`).
- **IDs** are a letter and two digits (`T05`), with a letter per batch of work. Never reuse an ID: letters used so far are A B C D E F G H I K L M N P Q R S T U V W Y.
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled with the ID (`T05: …`). **Start:** `git fetch origin`, check its dependencies are ✅ on `origin/main`, branch from `origin/main`, open a draft PR; its first commit sets the row to 🔄. **Finish:** bring in the latest `origin/main`; the last commit before merge sets the row to ✅. A closed, unmerged PR resets it to ⬜.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates `product-spec.md` and/or `tech-design.md` in the same PR (bump the version) and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| D08 | ✅ | Design handoff v9 in the repo (Account, Behavior Notes, prototype; Glance Emails and `emails/sign-in-link.html`); spec v0.69, tech design v2.29 and these rows | — | Docs merged | §2 |
| W01 | ✅ | Sign-in countdown: `sentAt` on the `sent` state, `differentEmailIn(sentAt, now)`, the mono timer in place of "Use a different email" until 0; `backin=`/`hold=1` fixtures; remove the "I opened the link" button, `openedLink` and `copy.signIn.opened` | D08 | Pure and reducer tests for the countdown and the restart on a new send; view test for timer vs button; matches Account D and L | SIGNIN-04 |
| W02 | ✅ | Guest sign-in: `GUEST_EMAIL` in `env.ts`, `server/auth` guest service, `GET`/`POST /api/auth/guest` (Origin, rate limit), the secondary "Sign-in as guests" button on the form (`demo=1` fixture), failure line | W01 | Service tests: off → not-found, unknown account → not-found, on → session for that account only; route test for 429; view tests for disabled while sending or offline and hidden when signed out; matches Account X | SIGNIN-16, tech §6.2, §6.5 |
| W03 | ✅ | HTML sign-in email: `signInHtml.ts` from `emails/sign-in-link.html`, `signInMessage(to, url, season)` with `html`, season from the account's setting or the send date, copy in `copy.signIn.email` | D08 | Mailer tests: html has the button and raw link, URL and email escaped, season colors per season, text part has the same words and the link; manual look in Mailpit | SIGNIN-12, tech §6.2 |
| W04 | ✅ | Small UI: Now panel chevrons on the weather and event eyebrows; "‹ Settings" back link above and outside the panel on Location, Background and Ambient screen | D08 | Gallery in four seasons; matches the Today and Settings boards at the six sizes (styling only, no tests) | TODAY-01, SET-09, SET-10, BG-01 |
| W05 | 🔄 | Photos: thumbnail panel matches the featured height and scrolls inside (wide, mid); portrait featured photo contained via natural size; "Set as background" / "Background now · Change" | D08 | Component tests for both button states, the settings write and the slideshow pin, and contain for a portrait load; gallery and Photos board at the six sizes | PHOTO-15, PHOTO-16, §8.6 |
| W06 | ⬜ | Ambient transitions: `shell/ambientTransition.ts`, `useAmbientNavigate` for every way in and out, taps dropped while running, no page fade for `/ambient`, reduced-motion bypass | D08 | Tests: taps ignored mid-transition, navigation after the leave half, reduced motion pushes at once; visual check | AMB-10 |
