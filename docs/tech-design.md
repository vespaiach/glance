# Glance — Technical Design

| | |
|---|---|
| Status | v2.12 |
| Date | 2026-10-19 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.59) · [`design/handoff/`](design/handoff/README.md) (v7) |

The spec says **what** the app does (requirement IDs like `SYNC-02`); this document says **how**. On conflict, the spec wins on behavior and this document on implementation.

---

## 1. Decisions

| # | Area | Decision |
|---|---|---|
| D1 | Framework | **Next.js App Router, run as a SPA.** A persistent client shell in `(display)/layout.tsx` keeps the clock, idle, slideshow and sync timers alive across views. Views are `'use client'` segments. |
| D2 | Language / lint | TypeScript `strict`, Biome (lint + format, CI and pre-commit). |
| D3 | Styling | **StyleX** via Babel + PostCSS (`useCSSLayers: true`); `globals.css` holds only `@stylex;`. Tokens in `theme/` (`tokens.stylex.ts`, `type.stylex.ts`, `seasons.stylex.ts`), seasons and Ambient as `createTheme` in `themes.ts`. Components use `season.*` roles directly. Geist / Geist Mono are vendored woff2 loaded with `next/font/local`. `ui/Icon` wraps `lucide-react` and takes the glyph component, not a name. |
| D4 | Client data | **Local-first store on IndexedDB (Dexie).** The UI reads local data only; writes go local first; a sync engine in a Web Worker (D19) talks to the server. |
| D5 | Shell state | React context + `useSyncExternalStore` stores. No state library. |
| D6 | Validation | **Valibot** schemas in `domain/schemas.ts` are the single contract for client and server; types come from `v.InferOutput`. `SyncedXSchema` adds `updatedAt`, `version`, optional `deletedAt`. IDs are UUIDs, timestamps ISO-8601, dates `YYYY-MM-DD`. Schemas never transform. The event schema checks `endAt > startAt` and a span under 24 h. Weather icons are a closed set of Lucide kebab names that `ui` maps to components. `DEFAULT_SETTINGS` in `domain/defaults.ts`. |
| D7 | Database | **PostgreSQL** via `pg` with raw SQL behind a small `Db` interface (`all`, `one`, `run`, `exec`, `tx`; nested `tx` joins the outer one). Tests run on **PGlite** (`server/db/pglite.ts`). `timestamptz` → ISO string, `bigint` → number, `date` stays `YYYY-MM-DD`. Migrations are `db-migrations/NNN_*.sql`, applied at boot by `migrate()` (one transaction each, tracked in `schema_migrations`). Every service is `async` and takes the `Db`. Server tests get a fresh migrated PGlite DB per test (`migratedDbPerTest`). |
| D8 | IDs | **UUIDv7 generated on the client** (`domain/id.ts`). Offline creates need no remapping. Server-made ids (accounts, displays, photos) are UUIDv7 too. |
| D9 | Sync | Outbox push + versioned pull. SSE only says "something changed"; 30 s polling is the fallback (§5). |
| D10 | Conflicts | Last write **to reach the server** wins. The server stamps `updated_at` and `version`. |
| D11 | Auth | Magic link (or QR, D23); opaque session token in an httpOnly cookie. Tokens and pending ids are 32 random bytes (base64url); only their sha256 is stored. The waiting screen polls every 2 s. Cookies: `session` (400 days), `pending` (1 day), `link_email` (10 min), all `HttpOnly; SameSite=Lax; Path=/`, `Secure` on https (§6.2). |
| D12 | Photos | Three objects per photo, keyed `{account}/{id}.{orig|display|thumb}` (`photos.file_path` holds `{account}/{id}`), in a **`PhotoStore`**: local disk, AWS S3 or Cloudflare R2, picked by `PHOTO_STORE` (§6.3, §6.5). **`sharp`** makes WebP display (≤ 2560 px) and thumb (≤ 640 px) copies, upright by EXIF; the original is kept byte for byte. Raster formats `sharp` decodes are accepted; SVG is refused. |
| D13 | Weather and places | **Open-Meteo** forecast + geocoding behind `WeatherProvider`; **US Census Geocoder** behind `PlaceLocator` for reverse lookup. Both via `getJson` (8 s timeout, Valibot parse, any failure → `weather-failed`). Forecast cached per account for 15 min (`weather_cache`). Place search is US only, keeps names matching the query (a ZIP keeps all), requires a valid IANA zone, at most 5. `locatePlace` rounds to 2 decimals and asks the Census place and the Open-Meteo zone in parallel. |
| D14 | Email | A **`Mailer`** (`send` answers `Result<void, "mail-failed">`) with one adapter per provider, picked by `MAIL_PROVIDER`: **Resend**, **Mailtrap** and **Mailgun** over their HTTP APIs with plain `fetch`, and **SMTP** with **`nodemailer`** (dev sends to a local Mailpit). Every provider sends from `MAIL_FROM`. One attempt, no retry or fallback provider (§6.2, §6.5). |
| D15 | Time | No date library: `Intl.DateTimeFormat` + pure helpers in `domain/time.ts`, `month.ts` and `zone.ts`. "Local" means the **screen's time zone** `tz` (the saved place's zone, else the device's), never the device's: every helper that reads hours or dates takes `tz` last. `zone.ts` converts wall time ↔ instant (`wallTime`, `zonedInstant`, DST-safe: a skipped time moves forward, a repeated one is the earlier instant) and days (`dayNumber`, `dateKey`, `dayStart`, `addDays`). A date with no time (day key, `takenOn`, forecast day, month cell) is a UTC-midnight `Date` formatted in UTC. Formatters take minutes of the local day. `localZoneGuard.test.ts` bans local-zone `Date` getters in `src`; Vitest pins `TZ=Asia/Kolkata`. |
| D16 | Offline shell | **Serwist** PWA: precache build assets, fonts and public files; cache route HTML on activate and RSC payloads as fetched; NetworkFirst (3 s) for navigations and RSC; CacheFirst for photo files with warming; NetworkOnly for other `/api/*`. New versions activate only when idle (§4.5). |
| D17 | Runtime | **One Node process** (`next start`) behind HTTPS, with PostgreSQL at `DATABASE_URL` and photos in a persistent `DATA_DIR` (`disk`) or an S3 or R2 bucket. Migrations run at boot. One process is required by the in-process SSE bus. |
| D18 | Tooling | npm with exact pins, Node 24 (`.nvmrc`). Vitest + Testing Library + `fake-indexeddb`; Vitest compiles StyleX through `@rolldown/plugin-babel`. **No e2e tests** (§7). `comlink` for worker messaging, `dexie-react-hooks` for `useLiveQuery`. |
| D19 | Sync host | Sync runs in a **dedicated Web Worker** per tab. The page keeps reads and repo writes; the worker does push, pull/apply, SSE, polling, retries and weather (§4.6). |
| D20 | Location | The browser position (`devicePosition`: low accuracy, 10 s timeout, `maximumAge` 10 min) goes to the server, which turns it into a place with its zone (D13). Offered only with `geolocation`, a secure context and permission not `denied`. Failures: `denied`, `no-position`, `outside` (404), `lookup` (5 s limit, 5xx, network). The browser never calls a geocoder. |
| D21 | All-day events | `allDay: true`, `startAt` = the date's **UTC midnight**, no `endAt`, so the date never moves with the zone or DST. Repos read a day as timed events in `[dayStart(key, tz), dayStart(key+1, tz))` plus all-day events at that UTC midnight. `eventDayKey(event, tz)` is the one place that reads an event's date. Server: `events.all_day` with `CHECK (NOT all_day OR end_at IS NULL)`. |
| D22 | Photo details | Read on upload, **on the server**: title (`ImageDescription`/`XPTitle`), date (`DateTimeOriginal`/`DateTimeDigitized`), GPS → `placeAt` → "City, ST". Fallbacks from pure `domain/photoName.ts` (`nameFromFile`, `dateFromFile`), then `x-file-modified`, then the upload day. Rows store `sources` and `checked`. Photos are editable (`PUT` title, date, place, sources, checked) and deletable (tombstone; files removed after commit). |
| D23 | Screens and QR | `GET /api/displays` lists the account's displays (`kind`, `browser`, `lastSeenAt`, `current`); a transport read, not synced. Kind and browser come from the `User-Agent` (`domain/screens.ts` `deviceOf`); the name is built from them, not stored. QR sign-in reuses `magic_links` (kind `qr`, account + display ids, 5 min expiry) and the verify route; the code is drawn on the client with `uqr`. |

---

## 2. Architecture

```
┌──────────────────────── Browser (one per display) ────────────────────────┐
│  PAGE (UI thread)
│  Screens (features/*) ──read──▶ hooks (useLiveQuery) ◀── change broadcast ──┐
│        │ write                                                              │
│        ▼                                                                    │
│  Repos (data/repos) ──tx: row + outbox──▶ Dexie glance-{accountId} ◀──┐     │
│        │ nudge()                           (opened by both contexts)  │─────┘
│        ▼                                                              │
│  sync/host.ts ══Comlink══▶ SYNC WORKER (sync/sync.worker.ts)          │
│        ▲ photosChanged · restart            push outbox ──▶ API       │
│        │                                    pull + apply ─────────────┘
│        │                                    SSE /api/sync/stream, else poll 30 s
│        │                                    weather every 15 min
│        └─▶ photo ids ──postMessage──▶ service worker
│  Dexie glance-meta: {accountId, name, email, signedOut?}, read first at boot
│  Shell providers: Now · Settings · TimeZone · Season · Network · SheetHost · Idle
│  Service worker (Serwist): precache assets + route HTML/RSC, photo cache
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ JSON over HTTPS, session cookie
┌─────────────────────── Next.js server (single Node process) ──────────────┐
│  src/app/api/**/route.ts  (thin: session → Valibot parse → service → JSON)│
│  server/services/*  ──▶  server/db (pg Pool, raw SQL)  ──▶ PostgreSQL     │
│  server/bus  (in-process EventEmitter → SSE fan-out per account)          │
│  server/jobs (note expiry, link and photo-file cleanup)                   │
│  server/weather (Open-Meteo + Census)                                     │
│  server/mail: Mailer → Resend · Mailtrap · Mailgun · SMTP (nodemailer)    │
│  server/storage: PhotoStore → disk {DATA_DIR}/photos · S3 · R2            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Rules**
- Screens never `fetch` app data. Every server call goes through the **transport** (`data/sync/transport.ts`).
- The sync worker never posts data to the page; data and sync status reach the UI through Dexie. Only `photosChanged` and `restart` are messages.
- The server is the source of truth; IndexedDB is a replica plus a queue of pending writes.
- Weather is read-through: the worker fetches it every 15 min and stores it for offline use.
- Auth screens call the transport directly, not Dexie.
- Boot decides "signed in" from `glance-meta`, never the network. The SW caches the app and photo files, never API JSON.

---

## 3. Project structure

Feature folders. `src/app/` holds only thin route files that render a feature screen.

```
src/
  app/
    layout.tsx                    # <html>, fonts, @stylex
    (display)/layout.tsx          # DisplayProviders: auth gate, repos, sync host, shell providers
    (display)/(app)/layout.tsx    # AppShell (sidebar) + the event, note and photo sheets
    (display)/(app)/{today,calendar,weather,notes,photos,settings}/page.tsx
    (display)/(app)/settings/{background,location,ambient}/page.tsx
    (display)/ambient/page.tsx    # no sidebar, same providers as the views
    signin/                       # SignedOutProviders + SignInScreen
    dev/gallery/page.demo.tsx     # demo builds only (§6.5)
    sw.ts  serwist/[path]/route.ts  manifest.ts
    api/                          # route handlers (§6)
  domain/     # pure rules, Valibot schemas, Result, ids, time and zone helpers
  theme/      # StyleX tokens, seasons, themes, fonts
  ui/         # design-system components and shared pieces (Sheet, Zone, TimePicker, …); no data access
  copy.ts     # every user-facing string
  shell/      # AppShell, sidebar, providers/, SheetHost, SessionGuard, OfflineNotice, routes, fixture options
  data/
    db.ts  meta.ts                # account Dexie DB, glance-meta DB
    repos/                        # RepoProvider, repos + hooks, session boot, service worker client
    sync/                         # engine, status, worker, host, transport, httpTransport, fixtureTransport
    sw/rules.ts                   # SW rules shared with the page
  features/<view>/                # XScreen.tsx (container), components/, reducers, layout.ts
  features/gallery/               # /dev/gallery
  fixtures/   # dev/demo data and URL params
  server/     # 'server-only': db/, auth/, services/, weather/, mail/, storage/, jobs/, http.ts, env.ts, bus.ts, sse.ts, boot.ts
instrumentation.ts                # register() → bootServer() on the nodejs runtime
db-migrations/NNN_*.sql
```

**Dependency rules** (Biome `noRestrictedImports` per folder, plus `server-only`). Cross-module imports use `@/`; imports inside a module are relative.

| Module | May import |
|---|---|
| `domain` | Valibot only |
| `theme`, `ui` | `theme`, `domain` (types only) |
| `data` | `domain`; `fixtures` only in `data/sync/fixtureTransport.ts` and `data/repos/session.ts` |
| `fixtures` | `domain` |
| `shell`, `features/*` | `ui`, `theme`, `domain`, `data/repos`, `shell`, `copy`. A feature may import another feature's **index** only |
| `server` | `domain`, and `copy` for the sign-in email. Never `data`, `ui` or `features` |
| `src/app/**` | pages → `features`/`shell`; route handlers → `server`; `sw.ts` → `serwist` and `data/sw` |

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
  outbox:   '++seq, entity, entityId',    // { seq, entity, entityId, op: 'put'|'delete', payload?, attempts }
  meta:     'key',                        // cursor, status
});
```
- **One database per account** (`glance-{accountId}`), deleted on sign-out. Demo builds use `glance-fixture`, reseeded on each load.
- Rows keep the server's soft delete (`deletedAt`); hooks filter it out.
- Pending ("Waiting to post") is derived from the outbox, never stored.
- Wire format = domain types (camelCase). Snake_case exists only in SQL.
- Range queries compare ISO strings; every stored timestamp is UTC `toISOString()`.

### 4.2 Repository pattern
Each repo has a small interface and one Dexie implementation (`createXRepo(store)` + a `useXRepo()` hook). A write is **one Dexie transaction** — the row plus an outbox entry — then `nudge()` once it commits. A put keeps the stored server fields (a new row gets version 0); a remove sets `deletedAt` locally and queues a delete. Settings are one row keyed by `accountId`, merged over defaults. Photo uploads skip the outbox (§6.3); photo edits and deletes use it.

Hooks are `useLiveQuery` reads (`undefined` while loading, deleted rows filtered): events by day or month in `tz`, `useEvent`, `useNote`, `useNotes(now)` (newest first, expired hidden, `waiting` derived), `usePhotos`, `usePhoto`, `usePictureOfDay`, `useSettings`, `useWeather`, `useSyncStatus`, `useOutboxEmpty`. So every view updates by itself after any write (EVT-07, CAL-02).

`RepoProvider` takes a `RepoStore` (`db`, `accountId`, `account`, `now`, `nudge`, `refreshWeather`, `photoSrc`, `upload`, `places`, `locate`, `displays`, `issueQr`/`voidQr`, `signOut`, `markSignedOut`). The shell builds it; tests inject one.

**Transport.** Every server call is a `Transport` method returning `Promise<Result<T, TransportError>>`, with `TransportError` = `network` · `unauthorized` (401) · `invalid` (400/404/409/422) · `outdated` (426) · `server` (5xx, 429, non-JSON 2xx). Methods: `push(entry)` → `Change`, `pull(cursor?)` → `{ cursor, changes }`, `weather`, `places(query)`, `locate(coords)` (adds `outside`), `upload(file, modifiedOn, onProgress)` (adds `too-large` / `not-a-photo`), `displays`, `issueQr`/`voidQr`, and `auth.*` (`link`, `status`, `name`, `location`, `signout`). Callers drop stale answers rather than cancel.
- `HttpTransport` talks to the same-origin API with fetch (XHR for upload progress) and sends `X-Glance-Build: {CLIENT_BUILD}` on every request. Bodies are trusted as typed.
- `FixtureTransport` (demo) seeds Appendix A data, answers pushes locally, and simulates delays, failures and sign-in states from the fixture URL params.

### 4.3 Shell
| Provider | Holds |
|---|---|
| `NowProvider` | The app's only clock (1 s tick). `useNow("second" \| "minute" \| "day")` re-renders only when that unit changes; `useNowStore()` for effects. `?now=` freezes it until the first tap |
| `SettingsProvider` | Saved settings merged over defaults (+ fixture overrides). Renders nothing until the first read lands |
| `TimeZoneProvider` | `useTimeZone()` = the saved place's zone, else the device's (LOC-06) |
| `SeasonProvider` | Active season as a StyleX theme on a `display: contents` wrapper; re-checks at midnight |
| `NetworkProvider` | `online` (`navigator.onLine` and `meta.status.online`), `showOfflinePill` after 30 s, `savedAt` |
| `SheetHost` | One open sheet `{ kind, … }`; closes on route change |
| `IdleProvider` | Touch timer → `/today`, or `/ambient` during ambient hours; enters and leaves Ambient on the schedule; paused while a text field is focused; applies a waiting update when idle (§4.5) |

Nesting: Now → Repo → Settings → TimeZone → Season → Network → SheetHost → FixtureParams → Idle. `DisplayProviders` wraps the views and `/ambient`, so moving to Ambient keeps the clock, DB and sync host. `/signin` uses `SignedOutProviders` (no account DB).

**Boot** (`useDisplayBoot`): demo opens and reseeds `glance-fixture` with an inline host and `FixtureTransport`. Otherwise it reads `glance-meta`: no entry or `signedOut` → `/signin`; else open `glance-{accountId}`, clear a halt left by the last session (`restarted` status event) and start the worker host.

**AppShell** owns the sidebar reducer (`shell/sidebar.ts`): `hidden | rail | expanded`, with `show` (grip), `open` (expand handle), `hide` (rail ✕), `close` (drawer Close), `back` (Escape, drawer row) and `viewChanged` (expanded → rail; hidden → rail except on Today). Initial state: rail on every view but Today; `rail=1|open` override. The root pads by `sidebarInset(mode)`. Focus moves only after user actions (SHELL-09). The shell also paints the photo background (`useBackgroundPhoto` → `ui/PhotoBackdrop`, cross-fading layers), places the offline pill (`OfflineNotice`), pads by the keyboard inset, and prefetches the six views.

**Background rotation.** `domain/background.ts` `shownBackground(background, photos, now, tz)` derives the photo: in Slideshow, `photoId` is the rotation anchor and `rotationStep` counts hours, days or Sunday weeks in `tz`, so every display shows the same photo with no timer. `changeBackground` re-anchors so the photo on screen stays. Photo mode with no or an unknown photo falls back to the oldest upload.

**Fixture params** (spec §6) are parsed once in `fixtures/params.ts`, only in demo builds, and become provider options, seed options or reducer initial states. An offset-less `now=` is a Pacific wall time.

**Signed-out screen** (SIGNIN-13). On `unauthorized`, `SessionGuard` marks the `glance-meta` entry `signedOut` and routes to `/signin` once no sheet is open and no field is focused. The outbox stays. `/signin` reads the kept account's email, pending count and settings to show the notice and the different-email warning. On `/ambient` the notice shows in place and the wake tap goes to `/signin`.

### 4.4 Screens and components
- **Container / presentational.** `features/*/XScreen.tsx` reads hooks, `useNow()` and `useTimeZone()` and passes plain props. `ui` components are pure (props + optional `xstyle`), get words as props (they can't import `copy`), and render `<button>` only when given `onClick`.
- **Rules are pure** in `domain` (`eventStatus`, `todayHero`, `todaySchedule`, `pictureOfDay`, `inAmbient`, `zoneState`, …) and unit-tested. Components hold no business rules.
- **Multi-state flows** are a discriminated union + reducer, with the fixture param as initial state: event and note sheets (with Discard changes? via `ui/discard.ts`), photo sheet, weather setup (`editing | searching | choosing | locating | confirm-zone`, shared by Weather, Settings › Location and the sign-in location step through `useWeatherSetup`), sign-in, upload tiles, slideshow (`playing | paused | pinned`), full-screen photo, QR tile, sidebar.
- **Layouts.** Each feature's `layout.ts` maps the breakpoint (`useBreakpoint()`, spec §5.1) to a StyleX grid. Today uses `todayLayout(width, height)` → `stacked` (< 768 px) · `portrait` · `landscape`; unstacked grids fit the window with no scroll and scale type with `clamp(…vw, …vh)`, and the Clock and temperature with container units.
- **Today schedule rows** are measured: `useScheduleRows` measures the card (`ResizeObserver`) and `scheduleRows({ available, rowHeight })` gives 2..10 rows (6 when stacked); `todaySchedule` picks which events stay and the rest go behind "See all".
- **Picture of the day** is a slot in the hero. `pictureOfDay(rows, dayKey, tz, seed)` replays a seeded cycle day by day over all photo rows (tombstones included), with "On this day" first, so the pick is stable for every display. Tap → `/photos?photo={id}`, which opens the slideshow pinned and paused on it.
- **Slideshow** index is derived from `{ from, since }` and `now` (8 s per slide), never a timer.
- **Uploads** run one XHR per file through `PhotosRepo.upload`; tiles live in memory, pause offline and resume or restart on reconnect.
- **Keyboard** (KB-*): `useKeyboardInset()` reads `visualViewport`; sheets and pages pad by it and `useFieldInView` scrolls the focused field into view. Return in a single-line input moves to the next field or submits.
- **Accessibility**: `PillTabs` is a `<fieldset>` of `aria-pressed` buttons; `Sheet` is a `role="dialog"` with focus trap and return; `onAccent` is black except in Winter (4.5:1, checked by `theme/contrast.test.ts`); reduced motion zeroes `durBase` and `durSeason`.
- **Gallery** (`/dev/gallery`) shows every `ui` component in the four seasons and every state the boards show.

**Zone state** (LOAD-\*, FAIL-\*, OFF-\*). Local reads don't fail, so a zone's state describes freshness. `zoneState()` is a pure function of (rows, ever synced, sync status, now); **ever synced** = a pull cursor exists in `meta`.

| State | When |
|---|---|
| `loading` | No local rows, never synced, for up to 10 s |
| `failed` | No local rows, never synced, and the pull failed or took over 10 s |
| `empty` / `ready` | Ever synced, or local rows exist. `ready` carries `updatedAt` when the last sync failed |

Weather uses `weatherZone({ located, weather, failed, timedOut })` over `status.weather`: `empty` without a location, `ready` with a saved forecast. `shell/sourceZone.ts` turns these into `{ state, retryIn, retry }`. Every zone renders through `ZoneState<T>` + `<Zone>`, which has its own error boundary.

### 4.5 Offline boot and caching
A signed-in screen must cold-start offline with every view working.

- **Static routes.** Every view, `/ambient` and `/signin` is fully static (no `cookies()`/`headers()`); auth gating is on the client; `useSearchParams` sits in `Suspense`. `/` → `/today` is a `redirects()` entry.
- **Auth offline.** `glance-meta` holds `{ accountId, name, email, signedOut? }`, written after sign-in. Offline, trust it; online, a 401 means signed out. Signing in to a different account first deletes the old account's DB and `photos` cache.
- **Photos offline.** After each pull, and at start for every saved photo, the worker sends `photosChanged(ids)`; the page forwards them to the SW, which fetches `thumb` and `display` into the `photos` cache one at a time.
- **Storage.** `navigator.storage.persist()` after sign-in. Manifest: `display: fullscreen`, `start_url /today`. Home-screen install on iPad avoids Safari's 7-day cap.
- **Updates.** A new SW waits. At an idle move with an empty outbox, `IdleProvider` posts `SKIP_WAITING` and loads the target path on `controllerchange`; the SW is checked hourly. **Build check:** entity writes and `/api/sync` answer **426** when `X-Glance-Build` is missing or below `MIN_CLIENT_BUILD`. After a 426 the outbox can't drain, so the update applies at the next idle even with entries pending; they survive the reload and the new build pushes them. Without a waiting SW, an `outdated` screen does a full page load at idle instead. Any change that adds a field to a synced row raises `CLIENT_BUILD` and `MIN_CLIENT_BUILD` (`domain/build.ts`), because Valibot drops unknown keys and an older client would write the row back without it. New settings fields use `v.optional(…, default)`, so older rows parse.
- **Sign-out.** Stop the host (terminates the worker), call `auth.signout()` (answer ignored), clear `glance-meta`, delete the account DB and the `photos` cache.

| Request | Strategy |
|---|---|
| `/_next/static/*`, fonts, icons, manifest, `public/**` (not videos) | Precache; other `/_next/static/*` CacheFirst `assets` |
| Route HTML | Cached on SW activate (`OFFLINE_PAGES`) + NetworkFirst 3 s → cache → `/today` |
| RSC (`RSC: 1`) | NetworkFirst 3 s, cached by path + segment header, `_rsc` ignored |
| `/api/photos/{id}/file` | CacheFirst `photos` + warming, 300 entries |
| `/videos/{season}.mp4` | CacheFirst `videos`, whole file (Range dropped), ranges served from cache |
| Other `/api/*` | NetworkOnly |

Not used: Background Sync (no Safari/Firefox support, duplicates the outbox), caching API JSON, periodic sync.

**Constraints**
- `@serwist/turbopack` compiles `sw.ts` with esbuild to an IIFE at `/serwist/sw.js`, registered as a classic script by the page itself (not `SerwistProvider`). Turbopack is used for dev and build.
- A plugin rebuilds cached responses (`new Response(body, cached)`) so the Turbopack sync-worker script keeps its `#params` URL.
- The SW is off in `next dev`; test on `next build && next start` over HTTPS.
- RSC caching depends on Next internals: pin Next exactly and rerun the offline manual check (§7) on every upgrade.
- "Offline" means our server is unreachable. A failing weather provider is FAIL-*, not offline.

### 4.6 Sync worker
The worker owns the outbox drain, pull + apply, the SSE stream with 30 s polling fallback, retries, the `glance-sync` lock and weather. Both contexts open the same Dexie DB; Dexie broadcasts changes, so page hooks update by themselves. Status lives in `meta.status`, so every tab reads the same one.

| Direction | Message |
|---|---|
| page → worker | `start(accountId, page)`, `nudge()`, `resync()`, `refreshWeather()`, `stop()` |
| worker → page | `photosChanged(ids)`, `restart()` |
| worker → `meta.status` | `{ online, lastSyncedAt?, error?: 'unauthorized' \| 'server' \| 'outdated', retryAt?, weather: idle \| loading{since} \| failed{retryAt} }` |

**Code.** `engine.ts` holds all logic with no Worker/DOM APIs and runs anywhere; `worker.ts` adds the lock, SSE, polling and outbox watch with injectable deps; `sync.worker.ts` only exposes it with Comlink; `host.ts` spawns it, or runs it inline in demo builds or without `Worker`.

**Rules**
- **Serial runs.** `nudge()` = drain the outbox (re-read by `seq` before each push, no in-memory copy), then pull. One queue, so an entry is never pushed twice.
- **Pending rows win.** Push answers and pulled rows are written only when no outbox entry remains for that row.
- **Errors** follow §5. `unauthorized` / `outdated` halt the engine and keep the outbox. `network` / `server` keep the entry, bump `attempts`, and retry on the FAIL-03 schedule (`retryDelayMs`: 1, 2, 5, then every 5 min).
- **One active worker per browser:** only the `glance-sync` lock holder syncs. It nudges on a new outbox entry from any tab, on each SSE ping and stream reopen, on `online`, and every 30 s while the stream is closed and no retry is waiting.
- **Weather** refreshes at start, every 15 min, on `refreshWeather()`, and right after a sync that brings a new location (once its settings push is accepted). Failures retry on the FAIL-03 schedule.
- **Schema upgrades:** on `versionchange` the worker stops and posts `restart`; the page respawns it after its own upgrade. The worker never blocks an upgrade.
- The worker never touches `navigator.serviceWorker`; the page forwards photo ids.

---

## 5. Sync protocol

**Push.** The engine drains the outbox in `seq` order, one request at a time: `PUT /api/{entity}/{id}` (full row, idempotent upsert) or `DELETE /api/{entity}/{id}`. On 2xx it removes the entry and saves the returned row only if no other entry for that row remains. Errors:
- **401** → keep the outbox, stop syncing, sign the screen out (§4.3).
- **400/404/422** → drop the entry, delete the local row if nothing else is pending, and pull from scratch to restore the server's copy.
- **426** → keep the outbox, stop syncing, update at the next idle (§4.5).
- **Network / 5xx** → keep the entry and retry with backoff and on reconnect.

**Pull.** Every write bumps a global `sync_state.version` in the same transaction and copies it to the row. `GET /api/sync?since={cursor}` returns `{ cursor, changes: [{ entity, row }] }` for the account's events, notes, photos and settings with `version > since`, tombstones included. The client applies them in one transaction, skipping rows with a pending outbox entry.

**Versions commit in order.** Each write transaction takes the `sync_state` row lock first (`stamp()` when it always writes, else `lockVersions()` then `stamp()`), so version *n* commits before *n + 1* is handed out. A no-op write bumps nothing. `pullChanges` runs in one `REPEATABLE READ` transaction. So a cursor never skips a version.

**Conflicts** (SYNC-03)
- **Delete wins.** A `PUT` on a tombstone returns the tombstone unchanged.
- **Settings are one row.** The last write replaces the whole JSON.

**Triggers.** `GET /api/sync/stream` (SSE) sends `data: {"version":n}` when the account changes, with a `: heartbeat` every 25 s and nothing on connect. The bus is an in-process EventEmitter keyed by account. The stream has no build check (`EventSource` can't send headers); the pull that follows does.

---

## 6. Server design

### 6.1 Route handlers
`runtime = 'nodejs'`. Steps: Origin check (writes only) → build check (426) → session (`requireDisplay`, 401) → Valibot parse (400) → service → map the `Result` to JSON. Errors are `{ error: code }` with 400/401/403/404/409/413/415/426/429/502. No middleware for auth. Helpers in `server/http.ts`; handlers import service indexes, never `server/db`. Request schemas live in `domain/schemas.ts`.

| Route | Notes |
|---|---|
| `PUT/DELETE /api/{events,notes,photos}/{id}`, `PUT /api/settings/{accountId}` | Body is the domain schema (server fields stripped, body id = path id). Answers the stored `Synced<T>`. `DELETE` sets `deleted_at` and keeps the content. Another account's id → 404. Photos are only created by upload, so `PUT` doesn't insert and changes only title, date, place, sources and `checked` |
| `GET /api/sync`, `GET /api/sync/stream` | §5 |
| `POST /api/photos`, `GET /api/photos/{id}/file?v=` | §6.3 |
| `GET /api/weather` | The account's forecast; 409 `no-location`, 502 `weather-failed` |
| `GET /api/weather/places?q=` | `WeatherLocation[]` (empty = unknown place) |
| `GET /api/weather/locate?lat=&lon=` | Place with its zone; 404 outside the US |
| `GET /api/displays` | The account's displays, this one first, then by `last_seen_at` |
| `/api/auth/*` | §6.2 |

Every accepted write is announced on the sync bus. TPK-07 "same day" is a client rule; the server checks only `endAt > startAt` and a span under 24 h for timed events.

### 6.2 Auth (SIGNIN-*)
1. `POST /api/auth/link { email, timeZone }` → 204 + `pending` cookie. Email trimmed and lowercased; older unused email links voided; same answer whether the account exists. Limits: 5 per email and 20 per IP per 10 min (in memory) → 429. Failed send (`mail-failed`) → 502.
2. `GET /api/auth/verify?t=` → 303 to `/signin?link=opened` with a session for the opening device, or `/signin?link=stale` (unknown, used, voided, ≥ 10 min, or a QR ≥ 5 min); a stale email link sets `link_email` for "Send a new link". It creates the account if new (`time_zone` from the link).
3. `GET /api/auth/status` (2 s poll): a valid session → `signed-in { account, returning, setupDone }`; else the `pending` row → `waiting` · `expired { email }` · `finishing-elsewhere` (account unnamed or setup not done) · `signed-in` with a new session cookie. The waiting screen's display is created on that poll.
4. `POST /api/auth/name { name }` saves the name (≤ 100 chars). `POST /api/auth/location` saves the SIGNIN-14 place or a skip and sets `accounts.setup_done_at`.
5. `POST /api/auth/signout` deletes this display's session and display row.
6. `POST /api/auth/qr` makes a one-time QR link for this display (voiding its older one; 30/hour); `DELETE /api/auth/qr { url }` voids it. A stale QR never reveals the account email.

`requireDisplay` resolves the session cookie to `{ displayId, accountId }` and stamps `last_seen_at`. Displays store `kind` and `browser` from the `User-Agent`.

**Mailer** (`server/mail/`). Auth takes a `Mailer` in its deps and never sees a provider.

```ts
type MailMessage = { to: string; subject: string; text: string; html?: string };
type Mailer = { send(message: MailMessage): Promise<Result<void, "mail-failed">> };
```

- **Contract** (`mailer.ts`): the sender is bound from `MAIL_FROM` when the mailer is built, so messages carry no `from`. Any failure (a non-2xx answer, a network or SMTP error) is `mail-failed`, never a throw. One attempt, no retry. Adapters log the provider and the status, never the message (it holds the sign-in link).
- **Adapters**: `createResendMailer(config, from, fetch)` (`resend.ts`) → `POST https://api.resend.com/emails`, Bearer key, JSON `{ from, to, subject, text, html }`. `createMailtrapMailer` (`mailtrap.ts`) → `POST https://send.api.mailtrap.io/api/send`, or `https://sandbox.api.mailtrap.io/api/send/{inboxId}` when an inbox is set, Bearer token, JSON with `from: { email, name }` and `to: [{ email }]` (`parseAddress` splits `MAIL_FROM`). `createMailgunMailer` (`mailgun.ts`) → `POST https://api.mailgun.net/v3/{domain}/messages` (`api.eu.mailgun.net` for `eu`), Basic `api:{key}`, form-encoded fields. The three share one `postMail` step (`http.ts`). `createSmtpMailer(transport, from)` (`smtp.ts`) calls `transport.sendMail`; the factory passes `nodemailer.createTransport({ host, port, secure, auth })`.
- **Factory** (`index.ts`): `createMailer(config, from, fetch = globalThis.fetch)` switches on `config.provider`. `mailer()` builds it once from `env().mail` and `env().MAIL_FROM` and is shared by auth.
- **Tests**: one contract suite (`contract.ts`: an accepted message → `ok`; a rejected message and an unreachable provider → `mail-failed` without throwing; logs never hold the message text) runs against the HTTP adapters on a fake `fetch` and the SMTP adapter on a fake transport. Each adapter's tests check the URL, auth header and body encoding, plus Mailtrap's sandbox URL and Mailgun's EU host. The factory is checked to reach each provider.

### 6.3 Photos
`POST /api/photos` takes one file per request as the raw body (XHR, so progress is real): `Content-Type`, `Content-Length`, URI-encoded `x-file-name`, optional `x-file-modified` (ISO date). The server runs `uploadProblem` on the declared type and size, reads the body into memory stopping at 20 MB (413 `too-large`), decodes it and makes the two WebP copies with `sharp` in memory (415 `not-a-photo`), reads details (D22), puts the original and the copies in parallel, each with its content type, then inserts the row with the next version and answers 201. A failed upload removes its objects and leaves no row. The upload queue is in memory on the client; it isn't kept across reloads.

`GET /api/photos/{id}/file?v=display|thumb|orig` (session only, no build check since `<img>` can't send headers) streams the object through the server (so session auth and the SW photo cache stay same-origin) with its stored content type, `Cache-Control: private, max-age=31536000, immutable` and `nosniff`; 404 for a tombstone or a missing object. `DELETE` removes the three objects after commit; a failed remove is retried by the daily job.

**Photo store** (`server/storage/`). Services and jobs take a `PhotoStore` in their deps and never see paths or buckets.

```ts
type StoredObject = { body: ReadableStream<Uint8Array>; size: number; contentType: string };
type PhotoStore = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Result<StoredObject, "not-found">>;
  remove(keys: string[]): Promise<void>;
};
```

- **Contract** (`store.ts`): keys are `{file_path}.{variant}`; the original's content type is the one `sharp` decoded. `remove` of a missing key succeeds. Only `not-found` is a `Result`; disk and network failures throw (500).
- **Adapters**: `createDiskStore(root)` (`disk.ts`) writes under `{DATA_DIR}/photos` and sniffs the original's type on read. `createS3Store(config, fetch)` (`s3.ts`) signs single-request `PUT`, `GET` and `DELETE` calls with **`aws4fetch`** (SigV4) for AWS S3 and any S3-compatible endpoint; an S3 404 maps to `not-found`. AWS buckets are addressed virtual-hosted (`https://{bucket}.s3.{region}.amazonaws.com/{key}`); a custom `endpoint` (S3-compatible hosts, R2) is addressed by path (`{endpoint}/{bucket}/{key}`).
- **Factory** (`index.ts`): `createPhotoStore(config, fetch = globalThis.fetch)` switches on `config.kind`: `disk` → disk store at `{dataDir}/photos`, `s3` → S3 store, `r2` → S3 store with `endpoint = https://{accountId}.r2.cloudflarestorage.com` and `region = auto`. `photoStore()` builds it once from `env().storage` and is shared by services and jobs.
- **Tests**: one contract suite (`contract.ts`: put then get, missing key → `not-found`, idempotent `remove`) runs against the disk store on a temp dir and the S3 store on a fake `fetch` (`fakeS3.ts`, an in-memory bucket); the R2 config is checked to reach the R2 endpoint.

### 6.4 Jobs
`bootServer()` (from `instrumentation.ts`) migrates, exits on failure, then `startJobs()`: an hourly `unref` timer plus a tick at boot; daily jobs run on the first tick of each UTC day. A failing job is logged and doesn't stop the others. Jobs run across accounts.
- **Note expiry** (hourly): tombstones notes past the account's `noteExpiry` using the screens' `noteExpired` rule, then publishes each account's version on the bus.
- **Link cleanup** (daily): deletes `magic_links` expired more than 24 h ago.
- **Deleted photo files** (daily): removes the stored objects of tombstoned photos.

`accountTimeZone(db, accountId)` = the saved place's `timeZone`, else `accounts.time_zone`; the upload-day fallback reads it. Backups belong to the PostgreSQL host.

### 6.5 Config
`server/env.ts` parses `process.env` at boot: `DATABASE_URL`, `APP_URL`, `MAIL_FROM` (`Name <address>` or a bare address, checked as an address), the mail provider chosen by `MAIL_PROVIDER` (read into `env().mail`) and the photo store chosen by `PHOTO_STORE` (read into `env().storage`). Both choices are Valibot `variant`s:

| `MAIL_PROVIDER` | Variables |
|---|---|
| `resend` (default) | `RESEND_API_KEY` |
| `mailtrap` | `MAILTRAP_API_TOKEN`, optional `MAILTRAP_INBOX_ID` (sandbox inbox) |
| `mailgun` | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, optional `MAILGUN_REGION` (`us` default, `eu`) |
| `smtp` | `SMTP_HOST`, optional `SMTP_PORT` (587), `SMTP_SECURE` (`true`: TLS from connect, as on 465; else STARTTLS when offered), `SMTP_USER` and `SMTP_PASSWORD` (both or neither) |

| `PHOTO_STORE` | Variables |
|---|---|
| `disk` (default) | `DATA_DIR` |
| `s3` | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT` (S3-compatible hosts) |
| `r2` | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |

Bad config names the variables (not their values) and exits. `next build` needs no env. `.env.development` points at a local PostgreSQL, `.data/` and a local Mailpit (`MAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`); sign-in emails are read at `http://localhost:8025`.

**Demo build** (`NEXT_PUBLIC_DEMO=1`, implied by `next dev`): fixture URL params, `/dev/gallery` and the sign-in dev buttons are compiled in; the display uses `glance-fixture` + `FixtureTransport` and skips the `glance-meta` gate. Demo-only routes are `page.demo.tsx`, added to `pageExtensions` only for dev or demo builds.

---

## 7. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/domain`; server services, auth and jobs on a fresh migrated PGlite DB per test, each with a cross-account test; recorded Census answers |
| Component | Vitest + Testing Library | `ui` and feature components: clicks, validation, ARIA |
| Data / sync | Vitest + `fake-indexeddb`, stubbed `fetch` / `EventSource` | Repos (row + outbox in one transaction), `engine.ts` (push order, backoff, 401 keeps the outbox, pending rows skipped, tombstones, weather retries), worker lock and restart |
| Time zone | Vitest with `TZ=Asia/Kolkata` | `zone.ts` across DST in several zones; every rule that reads a day or hour runs in a zone other than the device's |

CI: `biome check` → `tsc --noEmit` → Vitest → `next build`.

**Manual checks** on a production build, before each release and every Next upgrade: visual parity with the boards at the 6 sizes; offline cold start with every view and synced photo (OFF-06); two screens syncing, offline replay, delete wins, polling fallback (SYNC-01..03); a 401 with a change waiting, then signing in with the same and another email (SIGNIN-13, SIGNIN-11); a new build applied on an idle screen (OFF-07).
