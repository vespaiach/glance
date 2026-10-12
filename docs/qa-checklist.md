# Glance — Manual QA checklist

| | |
|---|---|
| Status | v1.0 — Q01 |
| Inputs | [`product-spec.md`](product-spec.md) · [`tech-design.md`](tech-design.md) §4.5, §4.6, §5, §7 · [`deploy.md`](deploy.md) |

What the automated tests can't cover (tech-design §7, D18: no e2e tests). Run the whole list **before each release** and **on every Next.js upgrade** (the offline cold start leans on Next internals, tech-design §4.5). Copy the list into the release PR and tick it there; note the browser, device and build for each pass.

## Setup

A production build, never `next dev` (the service worker is off in dev).

- **Kiosk run (the release pass):** the Docker image behind Caddy with HTTPS ([`deploy.md`](deploy.md)), opened on the real screens: the wall iPad installed to the home screen, plus a second screen (another tablet, or a laptop browser) signed in to the **same** account.
- **Local run (a quick pass, e.g. before a Next upgrade PR):** `npm run build`, then start it with `DATA_DIR=<empty dir> APP_URL=http://localhost:3100 SMTP_URL=smtp://127.0.0.1:2525 MAIL_FROM='Glance <qa@example.com>' PORT=3100 npx next start -p 3100`. `localhost` counts as a secure origin, so the service worker runs without HTTPS. Point `SMTP_URL` at any local SMTP catcher (Mailpit, MailHog) to read the sign-in links. Two "screens" are two separate browser profiles (or one normal and one private window); two tabs of one profile share one database and are **one** screen.
- **"Server down"** means the server can't be reached (OFF-*): stop the container (`docker stop glance`), or on a local run kill the process with `kill -9`. A plain `Ctrl-C` / `SIGTERM` lets `next start` drain, and it keeps open sync streams alive while it does, so the screens never notice. Browser "offline" emulation alone isn't enough either, because the sync worker and service worker keep their own connections.
- Read a screen's sync state in DevTools › Application › IndexedDB › `glance-{accountId}`: `meta` › `status` (`online`, `error`, `lastSyncedAt`, `retryAt`) and the `outbox` table.

## 1. Visual parity (spec §11 phase 2)

- [ ] Each `docs/design/handoff/Glance Frames - *.dc.html` board matches its screen at the six board sizes, opened with the URL fixture params the boards name (demo build: `NEXT_PUBLIC_DEMO=1 npm run build`).
- [ ] `/dev/gallery` (demo build) in all four seasons: no broken component.
- [ ] On the wall iPad: Today, Calendar, Notes, Photos, Weather, Settings and Ambient fit the screen with no scrolling the board doesn't show, in portrait and landscape.

## 2. Offline cold start (OFF-06, OFF-03, OFF-04, tech-design §4.5)

On screen A, signed in, with at least one event, one note, two photos and a weather location:

- [ ] DevTools › Application › Service workers: `/serwist/sw.js` is activated and controls the page. Cache Storage holds the precache, `pages` (9 entries) and `pages-rsc`.
- [ ] `photos` cache holds `thumb` and `display` files for every photo, including ones this screen never showed.
- [ ] Server down. Reload (on the iPad: close the home-screen app and open it again). Today opens from saved data: clock, events, notes, picture of the day, forecast.
- [ ] With the nav bar, open Calendar, Weather, Notes, Photos, Settings and Today. Each one renders its saved data (Photos shows every thumbnail).
- [ ] Full loads of `/settings/background`, `/ambient` and `/calendar?date=<another day>` work. An unknown path opens Today.
- [ ] The weather and notes zones say they're offline / show "Forecast from {time}" once the forecast is over an hour old (OFF-03).
- [ ] Add a note. The sheet's button reads "Save for later", and the note shows **Waiting to post** (OFF-04).
- [ ] Server up. Within a few seconds the note loses "Waiting to post", and it appears on screen B (SYNC-02, tech-design §5: the reconnected stream pulls at once).

## 3. Two screens syncing (SYNC-01..03)

Screens A and B on the same account, both online:

- [ ] Add an event, a note and a settings change (season, background) on A. Each shows on B within a few seconds without touching B (SSE ping → pull).
- [ ] Edit the note on B. A shows the edit.
- [ ] Upload a photo on A (not on a phone, §1.2). B shows it in Photos and it's warmed into B's `photos` cache.
- [ ] **Offline replay:** server down; on A add two notes and edit an event; server up. They reach B in the order they were made (SYNC-03).
- [ ] **Delete wins:** take A off the network (Wi-Fi off), delete a note on B, edit the same note on A, then put A back on the network. The note stays deleted on both screens (SYNC-03).
- [ ] **Last write wins:** change the season on A, then on B. Both end on B's choice.
- [ ] Polling fallback: block `/api/sync/stream` (DevTools › Network request blocking) on B. A change on A reaches B within about 30 s.

## 4. Session ended (401, SIGNIN-13, SIGNIN-11)

- [ ] Server down on A only (A's Wi-Fi off). Add a note on A ("Waiting to post"). End A's session on the server: on the host, `sqlite3 /data/glance.db "DELETE FROM sessions"` (signs **every** screen out; on a shared install delete only A's row by `display_id`). A's Wi-Fi back on.
- [ ] A goes to the sign-in form on its next sync. The note isn't lost: the outbox still holds it.
- [ ] Sign A in again with the **same** email. The note posts and reaches B (SIGNIN-13).
- [ ] Repeat, but sign A in with a **different** email. The old account's data and its waiting note are gone from A, the new account opens empty, and nothing from the old account reaches the new one (SIGNIN-13, tech-design §4.5 Gap 3).
- [ ] Settings › Account › Sign out on B: B returns to the empty email form, A stays signed in (SIGNIN-11). B's `glance-{accountId}` DB and `photos` cache are deleted.

## 5. Updates on a kiosk (OFF-07, tech-design §4.5 Gap 6)

- [ ] Deploy a new build (`deploy.md` › Update) while A sits on Calendar. Within the hourly update check (or a reload of another tab), DevTools shows the new service worker **waiting**; A keeps running the old version.
- [ ] Leave A untouched. At the idle timeout (3 min by default) A goes to Today and reloads itself **once** into the new version (DevTools: the new worker is active, the old caches are cleaned up).
- [ ] Ambient: with the update waiting and the ambient schedule starting, A reloads into Ambient once.
- [ ] **Waiting changes hold the update:** server down, add a note on A, deploy, server up only after the idle timeout has passed with the note still waiting. A doesn't reload while the outbox has entries; it reloads at the next idle after the note posts.
- [ ] **Outdated (426):** run a server whose `MIN_CLIENT_BUILD` (`src/server/http.ts`) is above the screen's `CLIENT_BUILD` (`src/domain/build.ts`), with a screen holding a waiting note. The screen stops syncing (`status.error = "outdated"`), keeps the note, and at the next idle loads the new version even with the note waiting; the new version posts it.
- [ ] After the update, A still cold-starts offline (repeat section 2's reload step).

## Run log

| Date | Build | Where | Result |
|---|---|---|---|
| 2026-10-12 | `feat/Q01-qa-checklist` | Local run, headless Chrome 152, two profiles | See below |

**2026-10-12 local run.** Passed: sign-in through a local SMTP catcher; the SW precached 40 files, `pages` 9 and `pages-rsc` 13 on both screens; a note made on A showed on B within 3 s; with the server down a reload of A opened Today from saved data, the nav bar opened all six views, full loads of `/settings/background`, `/ambient` and `/calendar?date=…` worked, and a new note read "Save for later" then **Waiting to post**. Found and fixed: after an offline cold start the note only posted on the FAIL-03 retry (up to 5 min after the server came back), because the sync stream's first open never pulls; it now pulls when that first open follows a failed start (tech-design §4.6). Found (not an app bug): `Ctrl-C` on `next start` keeps sync streams open while it drains, so screens never see the server go away; the setup above says to kill it hard. Not run here, left for the kiosk pass: section 1 (each board was compared at the six sizes in its own V/I/Y task), photos, the iPad home-screen app, sections 4 and 5 beyond what's noted.
