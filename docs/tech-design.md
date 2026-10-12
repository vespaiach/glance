# Glance — Technical Design

| | |
|---|---|
| Status | v1.7 — F04 fonts and icons recorded in D3 · v1.6 — F03 tokens and seasons recorded in D3 and §3 · v1.5 — F02 StyleX setup recorded in D3 · v1.4 — F01 scaffold: Turbopack + `@serwist/turbopack` (§4.5), `@/` alias and Biome dependency rules (§3), exact pins (D18) · v1.3 (draft for review) — one `Transport` for every server call (§4.2), zone state keyed on "ever synced", status in Dexie `meta` (§4.6), phase mapping (§8), demo build flag (§6.5) · review fixes: zone states (§4.4), push/tombstone rules (§5), 426 update path, auth pending id, backups · v1.2: offline cold start (D16, §4.5), sync worker (D19, §4.6), no e2e tests (§7) |
| Date | 2026-10-11 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.8) · [`design/handoff/`](design/handoff/README.md) (v3) |

This document records the technical decisions. **What** the app does is in the product spec (requirement IDs like `SYNC-02` refer to it). This document covers **how** it's built. If they conflict, the spec wins on behavior and this document wins on implementation.

---

## 1. Decisions at a glance

| # | Area | Decision | Why |
|---|---|---|---|
| D1 | Framework | **Next.js (App Router), run as a SPA.** A persistent client shell lives in `(app)/layout.tsx`. Views are `'use client'` segments | Deep links work, and the shell's timers (clock, idle, slideshow, sync) survive view changes (spec §3) |
| D2 | Language / lint | **TypeScript `strict`**, **Biome** (lint + format, in CI and pre-commit) | Spec §3 |
| D3 | Styling | **StyleX** (Babel + PostCSS plugin). Tokens via `defineVars`, seasons via `createTheme`. Setup (F02): ESM `babel.config.js` (`next/babel` + `@stylexjs/babel-plugin`, `runtimeInjection: false`, `@/*` alias for `.stylex.ts` imports) and `postcss.config.js` reusing its plugins over `app/` and `src/` with `useCSSLayers: true`. `app/globals.css` holds only `@stylex;` (Biome allows that one at-rule). Turbopack picks up the Babel config in dev and build | Spec §3, §4. No CSS modules, no Tailwind, no inline `style`. CSS layers keep StyleX priorities without the `:not(#\#)` specificity hack. Tokens (F03): `tokens.stylex.ts` holds `colors`, `space`, `radii`, `shadows`, `motion` and `sizes` (touch, icon button, kiosk canvas, fluid gutter); `type.stylex.ts` holds `type` with the §4.3 fluid values; `seasons.stylex.ts` holds `season` (Spring values); `themes.ts` holds the `summer`/`fall`/`winter` themes and `ambientType`. The handoff's `--surface-hero/weather/notes/highlight/warm/deep` aliases are not ported: a var declared on `:root` would not follow a theme set lower down, so components use the `season.*` roles directly (spec §4.1 role table). `--season-name` comes from `copy.ts`. Fonts and icons (F04): Geist and Geist Mono variable woff2 files (from the `geist` npm package, OFL) are vendored in `src/theme/fonts/` and loaded by `src/theme/fonts.ts` with `next/font/local` (`weight: "100 900"`), so they are served from `/_next/static/media` and precached with the build. The root layout puts their `--font-geist-sans` / `--font-geist-mono` classes on `<html>`, and `type.fontSans` / `type.fontMono` start with those vars instead of the handoff's `'Geist'` / `'Geist Mono'` names (next/font hashes the family name). `<body>` gets `type.fontSans` and the body weight. `src/ui/Icon.tsx` wraps `lucide-react` (pinned 0.460.0): it takes the glyph component (`icon={House}`), not a name string, so unused icons tree-shake; size 24, stroke 1.75 below 48 px and 1.5 from 48 px, overridable (1.25 for large weather glyphs), round caps and joins, `currentColor`, `aria-hidden` |
| D4 | Client data | **Custom local-first store on IndexedDB (Dexie).** The UI reads local data only, writes go local first, and a sync engine in a Web Worker (D19) handles the server | Offline is a core requirement (OFF-*). One code path for online and offline. Small bundle, no RxJS, and the sync rules (D9, D10) are ours to read and change. **Rejected:** RxDB, which has its own replication but adds RxJS, a bigger bundle and a second JSON schema per collection. Dexie Cloud, which replaces our backend with its own server, PostgreSQL and auth. Dexie.Syncable, a legacy addon |
| D5 | Shell state | **React context + `useSyncExternalStore` stores.** No state library | Little shell state. External stores keep the 1 s clock tick from re-rendering the whole tree |
| D6 | Validation | **Valibot** schemas in `src/domain` are the single contract. Types come from `v.InferOutput` | Shared by client and server. Small bundle |
| D7 | Database | **SQLite** via `better-sqlite3` (WAL). **Raw SQL** with small typed helpers. Migrations: `db/migrations/NNN_*.sql` + `PRAGMA user_version` | Spec §3, open item D resolved |
| D8 | IDs | **UUIDv7, generated on the client** | Offline creates need no ID remapping. They sort by creation time |
| D9 | Sync | **Outbox push + versioned pull.** SSE only says "something changed"; polling every 30 s is the fallback | See §5. Refines SYNC-02 |
| D10 | Conflicts | **Last write to reach the server wins.** The server stamps `updated_at` and `version` | Display clocks can drift. Server order is the one order everyone agrees on (refines SYNC-03) |
| D11 | Auth | Magic link, opaque session token in an **httpOnly cookie**, stored hashed. The waiting screen **polls every 2 s** | Spec §8.1. Polling is enough for a 10-minute window |
| D12 | Photos | Files on disk under `/data/photos`. **`sharp`** makes a display (≤ 2560 px) and a thumb (≤ 640 px) WebP copy on upload | 20 MB originals are too heavy for a kiosk grid |
| D13 | Weather | **Open-Meteo** (forecast + geocoding) behind a `WeatherProvider` adapter. Settings store the chosen place with its coordinates. Server cache per account, 15 min TTL | Open item B. Free, no API key |
| D14 | Email | **Nodemailer over SMTP**, configured by env vars | Open item E |
| D15 | Time | No date library. **`Intl.DateTimeFormat`** plus pure helpers in `src/domain/time.ts`. Account stores an IANA `time_zone` | Few, well-specified formats (TIME-01). Open item C |
| D16 | Offline shell | **Serwist** (Workbox-compatible) PWA. Precache build assets, fonts and the HTML + RSC payloads of every static app route. **NetworkFirst** (3 s timeout) for navigations and RSC requests, falling back to the cache, then `/today`. **CacheFirst** for photo files, with cache warming. **NetworkOnly** for every other `/api/*` call (Dexie owns data). Web app manifest + `navigator.storage.persist()`. New versions activate only when the screen is idle. See §4.5 | OFF-*. Kiosk screens reload rarely, and when they do they must start offline |
| D17 | Hosting | **One Docker container** (`output: 'standalone'`) on a VPS or home server, volume at `/data` | Open item A. SQLite and photos need a persistent disk, and the SSE bus needs a single process |
| D18 | Tooling | **npm** (committed `package-lock.json`, `npm ci` in CI and Docker, every dependency pinned to an exact version, Node 24 via `.nvmrc`), **Vitest** + Testing Library + `fake-indexeddb`. **No e2e tests**: automated unit/component/data tests plus a manual QA checklist (§7). `comlink` for worker messaging | Small app, small team. The sync engine is host-agnostic, so the risky logic is tested without a browser |
| D19 | Sync host | Sync runs in a **dedicated Web Worker**, one per tab. The page keeps reads (`useLiveQuery`) and repo writes (row + outbox in one Dexie transaction). The worker does push, pull/apply, SSE, polling, retries and the weather refresh. Typed messages via **Comlink** | Pull/apply and JSON parsing stay off the UI thread, so the 1 s clock, slideshow cross-fades and touch never jank on low-end wall tablets |

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
│  NetworkProvider ◀── useLiveQuery(meta.status), written by the worker
│  Dexie glance-meta: {accountId, name, email}, read first at boot (§4.5)
│  Shell providers: Now · Settings · Season · Network · Idle · SheetHost
│  Service worker (Serwist): precache assets + route HTML/RSC, photo cache
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
- Screens **never call `fetch`** for app data. They read Dexie through hooks and write through repos. Every server call (sync, weather, place search, auth, upload) goes through the **transport** (`data/sync/transport.ts`), so phases 1–4 run with no backend.
- The sync worker **never posts data to the page**. Data and sync status reach the UI through Dexie. Only `photosChanged` and `restart` are messages.
- The server is the source of truth. The client's IndexedDB is a replica plus a queue of pending writes.
- Weather is **read-through**, not synced: the sync worker calls `GET /api/weather` every 15 min and writes the result to Dexie for offline use.
- Auth screens (sign-in, waiting, name) call the transport directly, not Dexie. They have no offline mode beyond SIGNIN-10.
- Boot decides "signed in" from `glance-meta`, never from the network. The service worker caches the app and photo files, never API JSON. Dexie is the only data cache.

---

## 3. Project structure

Feature folders. `app/` holds only thin route files that render a feature screen.

```
app/
  layout.tsx                 # <html>, fonts, globals.css (@stylex;)
  (app)/layout.tsx           # <AppShell> — providers, nav bar, sheet host, sync host
  (app)/today/page.tsx       # export default () => <TodayScreen />   (same for each view)
  (app)/{calendar,weather,notes,photos,settings,settings/background}/page.tsx
  signin/page.tsx  ambient/page.tsx  dev/gallery/page.tsx (excluded in prod)
  sw.ts                      # Serwist service worker: precache, runtime strategies, photo warming
  serwist/[path]/route.ts    # @serwist/turbopack: compiles sw.ts, serves /serwist/sw.js (§4.5)
  manifest.ts                # web app manifest (start_url /today, display fullscreen/standalone, icons)
  api/
    auth/{link,verify,status,name,signout}/route.ts
    events/route.ts  events/[id]/route.ts      # likewise notes, settings (PUT/DELETE)
    photos/route.ts  photos/[id]/file/route.ts # POST upload only · ?v=display|thumb|orig, authenticated
    weather/route.ts  weather/places/route.ts
    sync/route.ts  sync/stream/route.ts        # pull · SSE ping
src/
  domain/      # Valibot schemas + types, pure logic: status, time, season, temperature, defaults, zone state, wmo (weather code → icon + copy key)
  theme/       # tokens.stylex.ts, seasons.stylex.ts, type.stylex.ts, themes.ts (season + Ambient createTheme), fonts.ts + fonts/ (vendored Geist woff2)
  ui/          # DS components + shared pieces (§4.2 of the spec). StyleX only, no data access
  copy.ts      # every user-facing string (spec §10)
  shell/       # AppShell, NavBar, OfflinePill, SheetHost, providers/{now,settings,season,network,idle}, sw-updates.ts
  data/
    db.ts      # Dexie schema per account (entities + outbox + meta)
    meta.ts    # glance-meta Dexie DB: {accountId, name, email} for the signed-in account
    repos/     # events.ts, notes.ts, photos.ts, settings.ts, weather.ts — interface + Dexie impl
    sync/      # engine.ts       createSyncEngine({ db, fetch, now, onStatus }), no Worker/DOM APIs
               # sync.worker.ts  worker entry: opens Dexie, creates the engine, exposes the Comlink API
               # host.ts         page side: spawns + wraps the worker, inline fallback, feeds NetworkProvider
               # transport.ts    Transport interface (sync, weather, places, auth, upload) · HttpTransport | FixtureTransport
  features/
    today/ calendar/ events/ notes/ photos/ weather/ settings/ background/ ambient/ signin/
      <Name>Screen.tsx  components/  hooks/  layout.ts   # per-view grid (spec §5.3)
  fixtures/    # Appendix A data, bundled images, URL fixture-param parser (dev/demo only)
  server/      # 'server-only'
    db/        # connection (WAL, foreign_keys=ON), migrate.ts, queries/*.ts
    auth/      # magic links, sessions, requireDisplay()
    services/  # events, notes, photos, settings, sync — business rules + validation
    weather/   # WeatherProvider interface, open-meteo.ts, cache
    mail/  jobs/  bus.ts  env.ts      # jobs: note expiry, link cleanup, backup (§6.4)
db/migrations/001_init.sql
```

**Dependency rules** (enforced with Biome `noRestrictedImports` overrides per folder in `biome.json`, and the `server-only` package). Cross-module imports use the `@/` alias (`@/*` → `src/*`). Imports inside a module are relative:

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
- **Wire format = domain types** (camelCase, Valibot). Dexie stores them as-is. Snake_case exists only in SQL, and `server/db/queries` maps between the two.

### 4.2 Repository pattern
Each repo has a small interface (`EventsRepo.put / remove / byDay / byMonth …`) and one Dexie implementation. A write is **one Dexie transaction**: update the row and append to the outbox, then call `nudge()` on the sync host (§4.6). Screens use hooks (`useEventsOnDay(date)`) built on `useLiveQuery`, so every view, the calendar dots and Today update on their own (EVT-07, CAL-02).

The spec's "fixture repo first, API repo later" (spec §11) becomes a **transport swap**. Repos are always Dexie. The `Transport` interface covers every server call: `push`, `pull`, `weather`, `places`, `auth.*` (link, status, name, signout) and `upload(file, onProgress)`. `FixtureTransport` seeds the database with Appendix A data, accepts pushes without sending them, and simulates the rest with the spec's [Mock] delays and fixtures (place search, upload progress and failures, sign-in states). `HttpTransport` talks to the API. Screens don't change between Phase 2 and Phase 5.

### 4.3 Shell providers
| Provider | Holds | Notes |
|---|---|---|
| `NowProvider` | `now` store ticking each second, `useNow(granularity)` | Injectable (`?now=`, tests) — TIME-03. Minute subscribers re-render once a minute |
| `SettingsProvider` | Account settings from Dexie, merged with defaults | A write goes through `SettingsRepo` like any other entity |
| `SeasonProvider` | Active season → applies the StyleX theme on the root | Auto re-checks at midnight via `NowProvider` |
| `NetworkProvider` | `online`, `showOfflinePill` (after 30 s), `savedAt` | `navigator.onLine` + `meta.status` written by the sync worker (§4.6) |
| `IdleProvider` | Touch timer → `router.push('/today')` or `/ambient`. Also enters and leaves Ambient on the schedule (AMB-05) | Paused while a text field is focused (IDLE-02) |
| `SheetHost` | One open sheet `{kind, props}` | Closed on route change (SHELL-04) and idle |

Fixture URL params (spec §6) are parsed once in `fixtures/params.ts` and fed into these providers. They're only parsed in dev/demo builds.

### 4.4 Screens and components
- **Container / presentational split:** `features/*/XScreen.tsx` reads hooks and passes plain props down. `src/ui` components are pure: they take props and an optional `xstyle`, and never read data.
- Pure domain functions (`eventStatus`, `formatTime`, `seasonFor`, `toCelsius`, `nextHalfHour`, `noteTilt`) live in `src/domain` and get unit tests. Components don't contain business rules.
- Per-view grid templates are `layout(view, bp)` objects in each feature (spec §5.3). The breakpoint comes from a `useBreakpoint()` hook (matchMedia).
- **Never store derived values** (event status, counts, pending, hero state). Compute them.
- **Multi-state flows** (sign-in, upload tile, weather setup, sync status) are a discriminated union + a reducer. A URL fixture param is the reducer's initial state.
- **Services and the sync engine return `Result<T, ErrorCode>`** instead of throwing across boundaries.

**Zone state (LOAD-\*, FAIL-\*, OFF-\*).** Local reads don't fail, so a zone's state describes **freshness**, not the read. `zoneState()` in `domain` is a pure function of (local rows, ever synced, sync status, now). **Ever synced** = a pull cursor exists in `meta`, so it survives reloads:

| State | When |
|---|---|
| `loading` | No local rows, never synced, for up to 10 s (LOAD-02/03) |
| `failed` | No local rows, never synced, and the pull failed or took over 10 s (FAIL-01) |
| `empty` / `ready` | Ever synced, or local rows exist. Works offline after a reload. `ready` carries `updatedAt` when the last pull failed (FAIL-02) |

Weather uses its own `status.weather` (§4.6) instead of the pull. Every zone renders through `ZoneState<T>` + `<Zone>` and has its own error boundary.

### 4.5 Offline boot and caching
A signed-in screen must cold-start offline (after a reload or a power cut) with every view working.

**Gap 1: offline navigation (must-fix before Phase 5).** App Router soft navigation fetches RSC payloads even for `'use client'` pages.
- Every `(app)` route, `/ambient` and `/signin` is **fully static**: no `cookies()`, `headers()` or server data, and auth gating happens on the client. `?date=` is read with `useSearchParams` inside a Suspense boundary.
- Serwist precaches their HTML + RSC. At runtime, NetworkFirst (3 s) handles navigations and requests with the `RSC: 1` header, matched by pathname with the `_rsc` query ignored. A navigation that misses the cache falls back to `/today`.
- The shell prefetches all six views on startup (`router.prefetch`).
- `/` → `/today` is a `redirects()` entry in `next.config`, not a server component, so it stays static.

**Gap 2: auth bootstrap offline (must-fix).** The session cookie is httpOnly, and `glance-{accountId}` is only found through its own meta table.
- `data/meta.ts` keeps `{accountId, name, email}` in a small **`glance-meta`** Dexie DB, written after sign-in. Name and email let Settings render offline (SET-01, SET-08).
- Offline: trust it and open `glance-{accountId}`. No entry → `/signin`.
- Online: a 401 from any call means signed out (Gap 3).

**Gap 3: 401 handling (must-fix).** See the push errors in §5. If a different account signs in afterwards, the old account DB is deleted along with its pending writes.

**Gap 4: photos offline (recommended).** After each pull, the sync worker sends `photosChanged(ids)` to the page, and the page forwards them to the SW. The SW fetches the `thumb` and `display` variants into a CacheFirst `photos` cache (ExpirationPlugin, ~300 entries). The background, slideshow and picture of the day then work offline even for photos never viewed on that screen.

**Gap 5: storage eviction (recommended).** Call `navigator.storage.persist()` after sign-in. On iPad kiosks, install as a home-screen app (manifest: `display` fullscreen/standalone, `start_url` `/today`, icons). Installed apps are exempt from Safari's 7-day storage cap.

**Gap 6: updates on an always-on screen (recommended).** A new SW waits instead of taking over. Once `IdleProvider` reaches Ambient or Today-idle **and the outbox is empty** (`pendingCount` 0 in the worker status), `shell/sw-updates.ts` sends `SKIP_WAITING` and reloads once on `controllerchange`. Push endpoints stay backward-compatible. The client sends its build id, and the server answers incompatible clients with **426**. **After a 426 the outbox can't drain**, so the empty-outbox condition is dropped: the update applies at the next idle with entries still pending. They survive the reload in IndexedDB and the new version pushes them.

**Sign-out:** the page calls `stop()` and terminates the sync worker, then deletes the account Dexie DB, the `glance-meta` entry and the `photos` cache.

| Request | Strategy | Why |
|---|---|---|
| Static assets (`/_next/static/*`, fonts, icons, manifest) | Precache | Hashed and immutable. Needed for a cold start |
| Route HTML (navigations) | Precache + NetworkFirst 3 s → cache → `/today` | Fresh when online, instant when offline |
| RSC payloads (`RSC: 1`) | Precache + NetworkFirst 3 s → cache | Soft navigation fetches them even for client pages |
| Photo files (`/api/photos/{id}/file`) | CacheFirst + warming, ~300 entries | Immutable per id. Must work offline without having been viewed. Matched before the `/api/*` rule |
| `/api/sync*`, `/api/auth/*`, `/api/weather*`, all writes | NetworkOnly | Dexie owns data. The outbox owns retries |

**Not used:** `workbox-background-sync` (Safari and Firefox have no Background Sync API, and it would duplicate the outbox). Caching API JSON in the SW (Dexie is the single data source). Periodic background sync.

**Minor rules**
- Notes past `noteExpiry` are hidden on the client too. Expiry itself runs on the server (§6.4), so an offline screen still drops old notes.
- Only the sync worker holding the `navigator.locks` lock `glance-sync` syncs, so one tab per browser talks to the server (§4.6).
- "Offline" means the screen can't reach **our** server (OFF-*). If our server is up but the weather provider fails, that's FAIL-*, not offline.

**Constraints**
- The SW is disabled in dev (`next dev`). Test it on `next build && next start`.
- A SW needs HTTPS. For home servers, put Caddy in front of the container.
- RSC caching depends on Next internals (headers, `_rsc`, payload shape). **Pin the exact Next version** and run the offline cold-start manual QA checklist (§7) on every upgrade.
- **Bundler (decided in F01, verify in C04): Turbopack**, Next 16's default, for `next dev` and `next build`. No `--webpack` flag. The SW comes from **`@serwist/turbopack`**: a route handler `app/serwist/[path]/route.ts` (`createSerwistRoute`, statically generated) compiles `app/sw.ts` with esbuild and serves it at `/serwist/sw.js`. The page registers it with `SerwistProvider`. Precache entries for the route HTML/RSC go in `additionalPrecacheEntries`. StyleX supports Turbopack from Next 16.0.3 (spec §3). Rejected: `next build --webpack`, because it makes the dev and prod bundlers differ and works against Next's default. If C04 finds `@serwist/turbopack` can't precache what Gap 1 needs, fall back to `@serwist/cli`'s standalone build step after `next build`. Turbopack stays either way.

### 4.6 Sync worker
**Split.** The page reads through hooks, writes through repos, then calls `nudge()`. The worker owns:
- the outbox drain,
- pull-since-cursor + apply, skipping rows still in the outbox,
- the `EventSource` on `/api/sync/stream` with the 30 s polling fallback,
- backoff, the `glance-sync` lock, and weather: a refresh every 15 min, right after a pulled `settings` row changes `weatherLocation`, and on `refreshWeather()`. Failed fetches retry on the FAIL-03 schedule (1, 2, 5 min, then every 5).

Both contexts open the same Dexie DB. Dexie 4 broadcasts changes across contexts, so page `liveQuery` hooks update by themselves. **The worker never posts data to the page**, only `photosChanged` and `restart`. Status lives in `meta`.

**Messages** (typed, Comlink). The page passes its callbacks to `start` with `Comlink.proxy`. **Status is not a message:** the active worker writes it to `meta`, so every tab sees the same status with no relay.

| Direction | Message |
|---|---|
| page → worker | `start({ accountId, apiBase })`, `nudge()`, `resync()`, `refreshWeather()`, `stop()` |
| worker → page | `photosChanged(ids)`, `restart()` |
| worker → Dexie `meta.status` | `{ online, lastSyncedAt, everSynced, pendingCount, error?: 'unauthorized' \| 'server' \| 'outdated', weather: { state: 'idle' \| 'loading' \| 'failed', retryAt? } }`. Every tab reads it with `useLiveQuery` |

**Code layout** (`src/data/sync/`, §3):
- `engine.ts` holds all the logic and runs anywhere.
- `sync.worker.ts` hosts it in the worker.
- `host.ts` spawns it with `new Worker(new URL('./sync.worker.ts', import.meta.url), { type: 'module' })` and wraps it with Comlink. If `Worker` is unavailable, `host.ts` runs `engine.ts` inline behind the same API.
- **Fixture mode** spawns no worker: the engine runs inline with `FixtureTransport`.

**Rules**
- **Errors:** the §5 push rules run in the worker. On 401 it sets `error: 'unauthorized'` in the status, stops syncing and keeps the outbox, and the page routes to `/signin`. On 426 it sets `'outdated'` and the page applies the waiting update at the next idle, even with pending entries (§4.5 Gap 6).
- **Schema upgrades:** the worker handles `db.on('versionchange')` by closing Dexie and posting `restart`. The page terminates the worker and respawns it after its own DB upgrade. The worker must never block an upgrade.
- **Photo warming:** the worker posts `photosChanged(ids)`, and the **page** forwards them to the SW. The worker never touches `navigator.serviceWorker`.
- **No cached outbox:** the worker re-reads the outbox on every drain, with no in-memory copy.
- **One active worker per browser:** each tab spawns a worker, but only the holder of the `glance-sync` lock pushes, pulls, holds the SSE stream and refreshes weather. Other workers wait on the lock, and a `nudge()` in their tab reaches the active worker through the outbox write itself (Dexie change broadcast).

---

## 5. Sync protocol

Everything in this section runs in the sync worker (§4.6).

**Push (client → server).** The engine drains the outbox in `seq` order, one request at a time:
`PUT /api/{entity}/{id}` (full row, idempotent upsert) or `DELETE /api/{entity}/{id}`. 2xx → remove the entry, then save the returned row (with the server `updated_at`/`version`) **only if no other outbox entry remains for that row**. Otherwise a newer local edit made during the request would be overwritten. Errors:
- **401** → keep the outbox, stop syncing, route to `/signin` (§4.5 Gap 3).
- **400/422** → drop the entry, revert the row from the server (or delete it locally if the server never had it), log it. This should never happen after client validation.
- **426** → keep the outbox, stop syncing, apply the waiting update at the next idle (§4.5 Gap 6).
- **Network error / 5xx** → keep the entry and retry with backoff, and on reconnect.

**Pull (server → client).** Every write on the server bumps a global `version` (one counter table, incremented in the same transaction). `GET /api/sync?since={cursor}` returns `{ cursor, changes: [{entity, row}] }`, tombstones included. The client applies the changes in one transaction and **skips rows that have a pending outbox entry**, so a local edit isn't overwritten before it's pushed.

**Conflict rules** (refine SYNC-03):
- **Delete wins.** A `PUT` on a tombstoned row doesn't bring it back. The server returns the tombstone with 200, and the client applies it.
- **Settings are one row.** The last write replaces the whole JSON, so two screens changing different settings at the same moment lose one change. This is rare and accepted for v1.

**Triggers.** `GET /api/sync/stream` (SSE) sends `{version}` when the account changes. The `server/bus` EventEmitter fans out writes to the account's open streams, with a heartbeat every 25 s. If there's no SSE, the client polls every 30 s. A pull also runs on app start, on reconnect and after each push.

Photos: the metadata syncs this way. Files are warmed into the service worker's `photos` cache after each pull (§4.5 Gap 4). Uploads skip the outbox (§6.3).

---

## 6. Server design

### 6.1 Route handler shape
Each handler sets `export const runtime = 'nodejs'` and does four steps: `requireDisplay(req)` → `v.parse(Schema, body)` → service call → `Response.json`. Errors map to `{ error: code }` with 400/401/404/409/426. Next middleware is **not** used for auth, because it can't load `better-sqlite3`.
- Mutating routes also check that `Origin` matches `APP_URL` (CSRF defense on top of `SameSite=Lax`).
- **TPK-07 "same day"** is a client rule (the screen's local day). Timestamps are stored as UTC, so the server only checks `endAt > startAt` and `endAt − startAt < 24 h`.

### 6.2 Auth flow (SIGNIN-*)
1. `POST /api/auth/link {email, timeZone}`: void older links for the email, store `sha256(token)` with a random `pending_id` and the IANA `timeZone`, send the email. The waiting screen gets `pending_id` in a `pending` cookie. The response is the same whether or not the account exists.
2. `GET /api/auth/verify?t=…` (the link): check unused and < 10 min, mark used, create the account if new (`time_zone` from the link row), then create a display + session for **the opening device** and for the **waiting screen** (found by `pending_id`). Display rows are created only here, once the account exists. New account → name step on the opener (SIGNIN-06).
3. `GET /api/auth/status` (waiting screen, 2 s poll): `waiting | expired | needs-name-elsewhere | signed-in{name, returning}` → sets the session cookie once it's signed in.
4. `POST /api/auth/signout`: delete this display's session only (SIGNIN-11).

Session cookie: `HttpOnly; Secure; SameSite=Lax`, no expiry in v1 (spec non-goal). Rate limit `auth/link` per email and per IP (in memory).

### 6.3 Photos
`POST /api/photos` takes one file per request, sent with **XHR so the progress bar is real** (fetch can't report upload progress). The size and type checks run in the client first and again on the server. The server streams the file to disk, `sharp` makes the display and thumb copies, then it inserts the row and bumps the version. Metadata: `title` = file name without the extension, `taken_on` = EXIF date or else the upload date, `place` empty (the eyebrow then shows the date alone). Offline: the upload queue is in memory, and paused uploads resume on reconnect (PHOTO-09). They aren't kept across reloads in v1.

### 6.4 Jobs
`instrumentation.ts` → `register()` runs migrations, then starts timers. **Note expiry** runs hourly and soft-deletes notes older than the account's `noteExpiry`, using the account `time_zone`. **Link cleanup** runs daily. **Backup** runs nightly: `VACUUM INTO /data/backups/glance-{date}.db` (keep 7), and the host copies `/data/backups` and `/data/photos` off the machine (documented in the Docker README).

### 6.5 Config
`server/env.ts` parses `process.env` with Valibot at boot: `DATA_DIR`, `APP_URL`, `SMTP_URL`, `MAIL_FROM`. Bad config fails fast. Tokens are random and stored as sha256 hashes, so no signing secret is needed.

`NEXT_PUBLIC_DEMO=1` makes a **demo build**: fixture URL params, `/dev/gallery` and "Continue as demo" (SIGNIN-05) are compiled in. Demo uses the `glance-fixture` DB with `FixtureTransport` and skips the `glance-meta` gate. `next dev` implies it. Production builds leave it unset.

---

## 7. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/domain` (status, TIME-01 formats, season, TPK rules, temperature, zone state), server services against a temp SQLite file (incl. delete wins, 426) |
| Component | Vitest + Testing Library | `src/ui` and feature components with fixture props |
| Data | Vitest + `fake-indexeddb` | Repos: row + outbox in one transaction, derived "Waiting to post" |
| Data / sync | Vitest + `fake-indexeddb`, stubbed `fetch` / `EventSource` | Drives `engine.ts` directly: push order, backoff, 401 keeps the outbox, pull **and push responses** skip pending rows, tombstone applied, weather retry schedule, `versionchange` restart |

CI: `biome check` → `tsc --noEmit` → Vitest → `next build`.

**Manual QA checklist** (not automated):
- [ ] Visual parity with each `Glance Frames` board at the 6 sizes, opened via URL fixture params (spec §11 phase 2).
- [ ] Offline cold start on a production build: install the SW → go offline → reload → navigate all six views → add a note, which shows "Waiting to post" → back online → it syncs. Repeat on every Next upgrade (§4.5).

---

## 8. Mapping to delivery phases

Task breakdown with dependencies: [`execution-plan.md`](execution-plan.md).

| Phase (spec §11) | Technical work |
|---|---|
| 0 | Scaffold (npm, Next, StyleX, Biome, Vitest), `theme/`, `ui/`, gallery |
| 1 | `shell/` providers, routes, `data/db.ts` + `data/meta.ts` + repos, the `Transport` interface + `FixtureTransport`, `engine.ts` core (outbox drain, pull/apply, weather refresh, status in `meta`) run inline by `host.ts`, fixture params, `app/manifest.ts` |
| 2–4 | `features/*` against Dexie fixture data. Offline, failures and mock delays simulated by `FixtureTransport` |
| 5 | `server/*`, migrations, `HttpTransport`, SSE, auth, photos, weather, Docker image. `sync.worker.ts` + the `glance-sync` lock (the inline host stays as the fallback). Serwist SW strategies (§4.5), photo warming, the idle update flow |

---

## 9. Spec changes from this design

Confirmed 2026-10-11 and applied to the product spec (v0.5):

1. **D9 / D10** refine SYNC-02/03: SSE becomes a "changed" ping plus a versioned pull, and the server's arrival order decides last write wins (not the client's `updated_at`).
2. **D8** client UUIDv7 IDs. **D12** `sharp` copies. **D15** no date library. **D11** 2 s polling for the waiting screen.
3. Offline photo uploads aren't kept across a reload (§6.3).
4. Schema changes to the spec's §7.0: add an `accounts.time_zone` column, a `version` column on synced tables, and a `sync_state(version)` counter table.

Applied in spec v0.6 (offline cold start, §4.5):

5. §3 Offline bullet: installable PWA that cold-starts offline, HTTPS required, home-screen install recommended on iPad kiosks.
6. §8.1 **SIGNIN-13** (new): if the server no longer accepts the screen's session, it returns to the sign-in form. Unsynced changes are kept and sent if the same account signs in again.
7. §8.5 **NOTE-08**: expired notes are hidden on the screen too, even offline.
8. §9.5 **OFF-06** (new): cold start offline with every view and photos available. **OFF-07** (new): updates apply only while the screen is idle with nothing waiting to sync.

Applied in spec v0.7 (no e2e tests, D18):

9. §11 Phase 2 exit criteria: dropped "optionally Playwright visual snapshots". Screenshot review stays.

Applied in spec v0.8 (design review):

10. **OFF-07**: after the server rejects an outdated app, the update applies at the next idle even with changes waiting (§4.5 Gap 6).
11. **SYNC-03**: delete wins over a concurrent edit. Settings conflict as one record (§5).
12. §7 / §7.0: `Note.syncState` removed (derived). `weatherLocation` holds coordinates. `magic_links.pending_display_id` → `pending_id` + `time_zone`.
13. **PHOTO-03**: uploaded photos are dated by EXIF or upload date, with no place. §9.3: loading/failure in terms of local data (§4.4). §11 Phase 5 wording: transport swap.
14. §1.2 / §5.4: no photo upload on the `phone` breakpoint (future feature). Upload entry points are hidden by `useBreakpoint()`, and the upload code is unchanged.
15. §7: domain types match the store (`startAt`/`endAt`, `Photo.takenOn`/`createdAt`, `Synced<T>`). TPK-07 same-day is a client rule. AMB-03 "next notable day" rule. SIGNIN-11: waiting changes are discarded on sign-out (accepted for v1).
