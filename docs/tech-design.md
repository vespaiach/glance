# Glance — Technical Design

| | |
|---|---|
| Status | v1.0 — decisions confirmed 2026-10-11 |
| Date | 2026-10-11 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.4) · [`design/handoff/`](design/handoff/README.md) (v3) |

This document records the technical decisions. **What** the app does is in the product spec (requirement IDs like `SYNC-02` refer to it). This document covers **how** it's built. If they conflict, the spec wins on behavior and this document wins on implementation.

---

## 1. Decisions at a glance

| # | Area | Decision | Why |
|---|---|---|---|
| D1 | Framework | **Next.js (App Router), run as a SPA.** A persistent client shell lives in `(app)/layout.tsx`. Views are `'use client'` segments | Deep links work, and the shell's timers (clock, idle, slideshow, sync) survive view changes (spec §3) |
| D2 | Language / lint | **TypeScript `strict`**, **Biome** (lint + format, in CI and pre-commit) | Spec §3 |
| D3 | Styling | **StyleX** (Babel + PostCSS plugin). Tokens via `defineVars`, seasons via `createTheme` | Spec §3, §4. No CSS modules, no Tailwind, no inline `style` |
| D4 | Client data | **Custom local-first store on IndexedDB (Dexie).** The UI reads local data only, writes go local first, and a sync engine handles the server | Offline is a core requirement (OFF-*). One code path for online and offline |
| D5 | Shell state | **React context + `useSyncExternalStore` stores.** No state library | Little shell state. External stores keep the 1 s clock tick from re-rendering the whole tree |
| D6 | Validation | **Valibot** schemas in `src/domain` are the single contract. Types come from `v.InferOutput` | Shared by client and server. Small bundle |
| D7 | Database | **SQLite** via `better-sqlite3` (WAL). **Raw SQL** with small typed helpers. Migrations: `db/migrations/NNN_*.sql` + `PRAGMA user_version` | Spec §3, open item D resolved |
| D8 | IDs | **UUIDv7, generated on the client** | Offline creates need no ID remapping. They sort by creation time |
| D9 | Sync | **Outbox push + versioned pull.** SSE only says "something changed"; polling every 30 s is the fallback | See §5. Refines SYNC-02 |
| D10 | Conflicts | **Last write to reach the server wins.** The server stamps `updated_at` and `version` | Display clocks can drift. Server order is the one order everyone agrees on (refines SYNC-03) |
| D11 | Auth | Magic link, opaque session token in an **httpOnly cookie**, stored hashed. The waiting screen **polls every 2 s** | Spec §8.1. Polling is enough for a 10-minute window |
| D12 | Photos | Files on disk under `/data/photos`. **`sharp`** makes a display (≤ 2560 px) and a thumb (≤ 640 px) WebP copy on upload | 20 MB originals are too heavy for a kiosk grid |
| D13 | Weather | **Open-Meteo** (forecast + geocoding) behind a `WeatherProvider` adapter. Server cache per account, 15 min TTL | Open item B. Free, no API key |
| D14 | Email | **Nodemailer over SMTP**, configured by env vars | Open item E |
| D15 | Time | No date library. **`Intl.DateTimeFormat`** plus pure helpers in `src/domain/time.ts`. Account stores an IANA `time_zone` | Few, well-specified formats (TIME-01). Open item C |
| D16 | Offline shell | **Serwist** service worker: precache the app shell and fonts, cache-first for photo files | OFF-* and self-hosted fonts (§3 of the spec) |
| D17 | Hosting | **One Docker container** (`output: 'standalone'`) on a VPS or home server, volume at `/data` | Open item A. SQLite and photos need a persistent disk, and the SSE bus needs a single process |
| D18 | Tooling | **pnpm**, **Vitest** + Testing Library + `fake-indexeddb`, **Playwright** (e2e and visual snapshots) | |

---

## 2. Architecture

```
┌──────────────────────── Browser (one per display) ────────────────────────┐
│  Screens (features/*)  ──read──▶  hooks (useLiveQuery)  ◀── Dexie (IndexedDB)
│        │ write                                               ▲      ▲
│        ▼                                                     │      │
│  Repos (data/repos) ──tx: row + outbox entry─────────────────┘      │
│                                                                     │
│  Sync engine (data/sync):  push outbox ──▶ API     pull since cursor ──┘
│        ▲ "changed" ping (SSE /api/sync/stream, else poll 30 s)
│  Shell providers: Now · Settings · Season · Network · Idle · SheetHost
│  Service worker (Serwist): app shell, fonts, photo files
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ JSON over HTTPS, session cookie
┌─────────────────────── Next.js server (single Node process) ──────────────┐
│  app/api/**/route.ts  (thin: auth → Valibot parse → service → JSON)       │
│  server/services/*  ──▶  server/db (better-sqlite3, raw SQL)  ──▶ /data/glance.db
│  server/bus  (in-process EventEmitter → SSE fan-out per account)          │
│  server/jobs (note expiry, link cleanup; started from instrumentation.ts) │
│  server/weather (OpenMeteo adapter + cache) · server/mail (SMTP)          │
│  /data/photos/{account}/{id}.{orig|display|thumb}                         │
└───────────────────────────────────────────────────────────────────────────┘
```

**Rules**
- Screens **never call `fetch`** for app data. They read Dexie through hooks and write through repos. Only the sync engine, auth and upload code talk to the API.
- The server is the source of truth. The client's IndexedDB is a replica plus a queue of pending writes.
- Weather is **read-through**, not synced: the client calls `GET /api/weather` every 15 min and stores the result in Dexie for offline use.
- Auth screens (sign-in, waiting, name) call the API directly. They have no offline mode beyond SIGNIN-10.

---

## 3. Project structure

Feature folders. `app/` holds only thin route files that render a feature screen.

```
app/
  layout.tsx                 # <html>, fonts, globals.css (@stylex;)
  (app)/layout.tsx           # <AppShell> — providers, nav bar, sheet host, sync engine
  (app)/today/page.tsx       # export default () => <TodayScreen />   (same for each view)
  (app)/{calendar,weather,notes,photos,settings,settings/background}/page.tsx
  signin/page.tsx  ambient/page.tsx  dev/gallery/page.tsx (excluded in prod)
  api/
    auth/{link,verify,status,name,signout}/route.ts
    events/route.ts  events/[id]/route.ts      # likewise notes, photos, settings
    photos/[id]/file/route.ts                  # ?v=display|thumb|orig, authenticated
    weather/route.ts  weather/places/route.ts
    sync/route.ts  sync/stream/route.ts        # pull · SSE ping
src/
  domain/      # Valibot schemas + types, pure logic: status, time, season, temperature, defaults
  theme/       # tokens.stylex.ts, seasons.stylex.ts, type.stylex.ts, fonts.ts
  ui/          # DS components + shared pieces (§4.2 of the spec). StyleX only, no data access
  copy.ts      # every user-facing string (spec §10)
  shell/       # AppShell, NavBar, OfflinePill, SheetHost, providers/{now,settings,season,network,idle}
  data/
    db.ts      # Dexie schema (entities + outbox + meta)
    repos/     # events.ts, notes.ts, photos.ts, settings.ts, weather.ts — interface + Dexie impl
    sync/      # engine.ts, push.ts, pull.ts, stream.ts, transport.ts (Http | Fixture)
  features/
    today/ calendar/ events/ notes/ photos/ weather/ settings/ background/ ambient/ signin/
      <Name>Screen.tsx  components/  hooks/  layout.ts   # per-view grid (spec §5.3)
  fixtures/    # Appendix A data, bundled images, URL fixture-param parser (dev/demo only)
  server/      # 'server-only'
    db/        # connection (WAL, foreign_keys=ON), migrate.ts, queries/*.ts
    auth/      # magic links, sessions, requireDisplay()
    services/  # events, notes, photos, settings, sync — business rules + validation
    weather/   # WeatherProvider interface, open-meteo.ts, cache
    mail/  jobs/  bus.ts  env.ts
db/migrations/001_init.sql
tests/e2e/     # Playwright: flows + visual snapshots at the 6 board sizes
```

**Dependency rules** (enforced with Biome `noRestrictedImports` and the `server-only` package):

| Module | May import |
|---|---|
| `domain` | nothing app-specific (Valibot only) |
| `theme`, `ui` | `theme`, `domain` (types only) |
| `data` | `domain` |
| `shell`, `features/*` | `ui`, `theme`, `domain`, `data/repos` hooks, `shell`, `copy`. A feature may import another feature's **index** only (e.g. `today` uses `events`) |
| `server` | `domain` only. Never `data`, `ui` or `features` |
| `app/**` | page files → `features`/`shell`. Route handlers → `server` |

---

## 4. Client design

### 4.1 Local store (Dexie)
```ts
db.version(1).stores({
  events:   'id, startAt, deletedAt',
  notes:    'id, createdAt, deletedAt',
  photos:   'id, createdAt',
  settings: 'accountId',
  weather:  'accountId',
  outbox:   '++seq, entity, entityId',    // { seq, entity, entityId, op: 'put'|'delete', payload, attempts }
  meta:     'key',                        // cursor, lastSyncedAt, accountId
});
```
- **One database per account** (`glance-{accountId}`). Sign-out deletes it. Fixture/demo mode uses `glance-fixture`, reseeded on each load.
- Rows keep the server's soft delete (`deletedAt`). Hooks filter deleted rows out.
- `syncState: 'pending'` (e.g. "Waiting to post") is **derived**: the row has an outbox entry. It isn't stored.

### 4.2 Repository pattern
Each repo has a small interface (`EventsRepo.put / remove / byDay / byMonth …`) and one Dexie implementation. A write is **one Dexie transaction**: update the row and append to the outbox, then nudge the sync engine. Screens use hooks (`useEventsOnDay(date)`) built on `useLiveQuery`, so every view, the calendar dots and Today update on their own (EVT-07, CAL-02).

The spec's "fixture repo first, API repo later" (spec §11) becomes a **transport swap**. Repos are always Dexie. `FixtureTransport` seeds the database and accepts pushes without sending them. `HttpTransport` talks to the API. Screens don't change between Phase 2 and Phase 5.

### 4.3 Shell providers
| Provider | Holds | Notes |
|---|---|---|
| `NowProvider` | `now` store ticking each second, `useNow(granularity)` | Injectable (`?now=`, tests) — TIME-03. Minute subscribers re-render once a minute |
| `SettingsProvider` | Account settings from Dexie, merged with defaults | A write goes through `SettingsRepo` like any other entity |
| `SeasonProvider` | Active season → applies the StyleX theme on the root | Auto re-checks at midnight via `NowProvider` |
| `NetworkProvider` | `online`, `showOfflinePill` (after 30 s), `savedAt` | `navigator.onLine` + sync engine results |
| `IdleProvider` | Touch timer → `router.push('/today')` or `/ambient` | Paused while a text field is focused (IDLE-02) |
| `SheetHost` | One open sheet `{kind, props}` | Closed on route change (SHELL-04) and idle |

Fixture URL params (spec §6) are parsed once in `fixtures/params.ts` and fed into these providers. They're only parsed in dev/demo builds.

### 4.4 Screens and components
- **Container / presentational split:** `features/*/XScreen.tsx` reads hooks and passes plain props down. `src/ui` components are pure: they take props and an optional `xstyle`, and never read data.
- Pure domain functions (`eventStatus`, `formatTime`, `seasonFor`, `toCelsius`, `nextHalfHour`, `noteTilt`) live in `src/domain` and get unit tests. Components don't contain business rules.
- Per-view grid templates are `layout(view, bp)` objects in each feature (spec §5.3). The breakpoint comes from a `useBreakpoint()` hook (matchMedia).

---

## 5. Sync protocol

**Push (client → server).** The engine drains the outbox in `seq` order, one request at a time:
`PUT /api/{entity}/{id}` (full row, idempotent upsert) or `DELETE /api/{entity}/{id}`. 2xx → remove the entry and save the returned row (with the server `updated_at`/`version`). Network error → stop and retry on reconnect or with backoff. 4xx → drop the entry, revert the row from the server, and log it. This should never happen after client validation.

**Pull (server → client).** Every write on the server bumps a global `version` (one counter table, incremented in the same transaction). `GET /api/sync?since={cursor}` returns `{ cursor, changes: [{entity, row}] }`, tombstones included. The client applies the changes in one transaction and **skips rows that have a pending outbox entry**, so a local edit isn't overwritten before it's pushed.

**Triggers.** `GET /api/sync/stream` (SSE) sends `{version}` when the account changes. The `server/bus` EventEmitter fans out writes to the account's open streams, with a heartbeat every 25 s. If there's no SSE, the client polls every 30 s. A pull also runs on app start, on reconnect and after each push.

Photos: the metadata syncs this way. Files are fetched lazily through the service worker cache. Uploads skip the outbox (§6.3).

---

## 6. Server design

### 6.1 Route handler shape
Each handler sets `export const runtime = 'nodejs'` and does four steps: `requireDisplay(req)` → `v.parse(Schema, body)` → service call → `Response.json`. Errors map to `{ error: code }` with 400/401/404/409. Next middleware is **not** used for auth, because it can't load `better-sqlite3`.

### 6.2 Auth flow (SIGNIN-*)
1. `POST /api/auth/link {email}`: void older links for the email, store `sha256(token)` with `pending_display_id`, send the email. The waiting screen gets a `pending` cookie. The response is the same whether or not the account exists.
2. `GET /api/auth/verify?t=…` (the link): check unused and < 10 min, mark used, create the account if new, and create a session for **the opening device** and for the **pending display**. New account → name step on the opener (SIGNIN-06).
3. `GET /api/auth/status` (waiting screen, 2 s poll): `waiting | expired | needs-name-elsewhere | signed-in{name, returning}` → sets the session cookie once it's signed in.
4. `POST /api/auth/signout`: delete this display's session only (SIGNIN-11).

Session cookie: `HttpOnly; Secure; SameSite=Lax`, no expiry in v1 (spec non-goal). Rate limit `auth/link` per email and per IP (in memory).

### 6.3 Photos
`POST /api/photos` takes one file per request, sent with **XHR so the progress bar is real** (fetch can't report upload progress). The size and type checks run in the client first and again on the server. The server streams the file to disk, `sharp` makes the display and thumb copies, then it inserts the row and bumps the version. Offline: the upload queue is in memory, and paused uploads resume on reconnect (PHOTO-09). They aren't kept across reloads in v1.

### 6.4 Jobs
`instrumentation.ts` → `register()` runs migrations, then starts timers. **Note expiry** runs hourly and soft-deletes notes older than the account's `noteExpiry`, using the account `time_zone`. **Link cleanup** runs daily.

### 6.5 Config
`server/env.ts` parses `process.env` with Valibot at boot: `DATA_DIR`, `APP_URL`, `SMTP_URL`, `MAIL_FROM`, `SESSION_SECRET`. Bad config fails fast.

---

## 7. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/domain` (status, TIME-01 formats, season, TPK rules, temperature), server services against a temp SQLite file |
| Component | Vitest + Testing Library | `src/ui` and feature components with fixture props |
| Data | Vitest + `fake-indexeddb` | Repos, outbox ordering, pull merge (pending rows not overwritten) |
| E2E / visual | Playwright | Flows on `FixtureTransport`. Snapshots of each `Glance Frames` board at the 6 sizes via URL params (spec §11 phase 2). One full-stack smoke test against a real server |

CI: `biome check` → `tsc --noEmit` → Vitest → `next build` → Playwright.

---

## 8. Mapping to delivery phases

| Phase (spec §11) | Technical work |
|---|---|
| 0 | Scaffold (pnpm, Next, StyleX, Biome, Vitest), `theme/`, `ui/`, gallery |
| 1 | `shell/` providers, routes, `data/db.ts` + repos + `FixtureTransport`, fixture params |
| 2–4 | `features/*` against Dexie fixture data. Offline simulated by the transport |
| 5 | `server/*`, migrations, `HttpTransport`, SSE, auth, photos, weather, Serwist, Docker image |

---

## 9. Spec changes from this design

Confirmed 2026-10-11 and applied to the product spec (v0.5):

1. **D9 / D10** refine SYNC-02/03: SSE becomes a "changed" ping plus a versioned pull, and the server's arrival order decides last write wins (not the client's `updated_at`).
2. **D8** client UUIDv7 IDs. **D12** `sharp` copies. **D15** no date library. **D11** 2 s polling for the waiting screen.
3. Offline photo uploads aren't kept across a reload (§6.3).
4. Schema changes to the spec's §7.0: add an `accounts.time_zone` column, a `version` column on synced tables, and a `sync_state(version)` counter table.
