# Glance — Technical Design

| | |
|---|---|
| Status | v3.38 |
| Date | 2026-10-31 |
| Inputs | [`product-spec.md`](product-spec.md) (v1.46) · [`design/handoff/`](design/handoff/README.md) (v23) |

The spec says **what** the app does (requirement IDs like `SYNC-02`); this document says **how**. On conflict, the spec wins on behavior and this document on implementation.

---

## 1. Decisions

| # | Area | Decision |
|---|---|---|
| D1 | Framework | **Next.js App Router, run as a SPA.** A persistent client shell in `(display)/layout.tsx` keeps the clock, idle, slideshow and sync timers alive across views. Views are `'use client'` segments. |
| D2 | Language / lint | TypeScript `strict`, Biome (lint + format, pre-commit and the §7 checks). |
| D3 | Styling | **StyleX** via Babel + PostCSS (`useCSSLayers: true`); `globals.css` holds only `@stylex;`. Tokens in `theme/` (`tokens.stylex.ts`, `type.stylex.ts`, `seasons.stylex.ts`), seasons and Ambient as `createTheme` in `themes.ts`. Components use `season.*` roles directly. Geist / Geist Mono are vendored woff2 loaded with `next/font/local`. `ui/Icon` wraps `lucide-react` and takes the glyph component, not a name; stroke 1.75 (1.25–1.5 at ≥ 48 px). |
| D4 | Client data | **Local-first store on IndexedDB (Dexie).** The UI reads local data only; writes go local first; a sync engine in a Web Worker (D19) talks to the server. |
| D5 | Shell state | React context + `useSyncExternalStore` stores. No state library. |
| D6 | Validation | **Valibot** schemas in `domain/schemas.ts` are the single contract for client and server; types come from `v.InferOutput`. `SyncedXSchema` adds `updatedAt`, `version`, optional `deletedAt`. IDs are UUIDs, timestamps ISO-8601, dates `YYYY-MM-DD`. Schemas never transform. The event schema checks `endAt > startAt` and a span under 24 h. Text limits (`EVENT_LIMITS`, `NOTE_LIMITS`, `TAG_NAME_LIMIT`) are also the fields' `maxLength`. `DEFAULT_SETTINGS` in `domain/defaults.ts`. |
| D7 | Database | **A `Database` port** (`server/db/database.ts`): one repo per table plus `tx(fn)`. Transactions are atomic and run **one at a time** (each takes the `sync_state` row lock), which §5's version order relies on. Services import only the port (Biome blocks the adapters) and keep every rule themselves. Adapters, picked by `DB` (§6.5): **`postgres`** (`pg`, raw SQL) and **`memory`** (in-process PGlite, dev). Migrations `db-migrations/NNN_*.sql` run at boot; tests run them on PGlite; every adapter passes `databaseContract`. |
| D8 | IDs | **UUIDv7 generated on the client** (`domain/id.ts`). Offline creates need no remapping. Server-made ids (accounts, displays, photos) are UUIDv7 too. |
| D9 | Sync | Outbox push + versioned pull. SSE only says "something changed"; 30 s polling is the fallback (§5). |
| D10 | Conflicts | Last write **to reach the server** wins. The server stamps `updated_at` and `version`. |
| D11 | Auth | **Emailed 6-digit code** typed on the screen that asked for it (QR links stay, D23); an opaque session token in an httpOnly cookie (400 days, renewed by every `GET /api/sync`, so a screen in use never signs itself out). Only hashes are stored: the code's (one live code per email, 10 min, 5 tries) and the tokens'. `verifyCode` runs in one transaction with `timingSafeEqual`. Codes come from `AuthDeps.newCode`, so tests pass fixed ones (§6.2). |
| D12 | Photos | Two WebP copies per photo made by **`sharp`** (display ≤ 2560 px, thumb ≤ 640 px, upright by EXIF), keyed `{account}/{id}.{display\|thumb}` in a **`PhotoStore`**: local disk, AWS S3 or Cloudflare R2, picked by `PHOTO_STORE` (§6.3, §6.5). The original is read for details (D22) and decoded, then discarded, never stored; a boot job removes any `.orig` older builds kept. SVG is refused. A tombstoned photo's files are removed after commit, `files_removed` marks it done, and the daily job retries. |
| D13 | Weather and places | **Open-Meteo** forecast + geocoding behind `WeatherProvider`; **US Census Geocoder** behind `PlaceLocator` for reverse lookup. Both via `getJson` (8 s timeout, Valibot parse, any failure → `weather-failed`). Forecast cached per account for 15 min (`weather_cache`). Place search is US only, keeps names matching the query (a ZIP keeps all), requires a valid IANA zone, at most 5. `locatePlace` rounds to 2 decimals and asks the Census place and the Open-Meteo zone in parallel. |
| D14 | Email | A **`Mailer`** (`send` answers `Result<void, "mail-failed">`) with one adapter per provider, picked by `MAIL_PROVIDER`: **Resend**, **Mailtrap** and **Mailgun** over their HTTP APIs with plain `fetch`, **SMTP** with **`nodemailer`**, and **Mailpit** (the SMTP adapter on a local catch-all, the dev default). Every provider sends from `MAIL_FROM`. One attempt, no retry or fallback provider (§6.2, §6.5). |
| D15 | Time | No date library: `Intl.DateTimeFormat` + pure helpers in `domain/time.ts`, `week.ts` and `zone.ts`. "Local" means the **screen's time zone** `tz` (the saved place's zone, else the device's), never the device's: every helper that reads hours or dates takes `tz` last, and wall time ↔ instant is DST-safe. A date with no time is a UTC-midnight `Date` formatted in UTC. `localZoneGuard.test.ts` bans local-zone `Date` getters; Vitest pins `TZ=Asia/Kolkata`. |
| D16 | Offline shell | **Serwist** PWA: precache build assets, fonts and public files; cache route HTML on activate and RSC payloads as fetched; NetworkFirst (3 s) for navigations and RSC; CacheFirst for photo files with warming; NetworkOnly for other `/api/*`. New versions activate only when idle (§4.5). Under `next dev` no worker registers, and `register()` unregisters any worker a production build left on the same origin. |
| D17 | Runtime | **One Node process** (`next start`) behind HTTPS, with the database picked by `DB` (PostgreSQL at `DATABASE_URL` by default) and photos in a persistent `DATA_DIR` (`disk`) or an S3 or R2 bucket. Migrations run at boot. One process is required by the in-process SSE bus and the `memory` database. |
| D18 | Tooling | npm with exact pins (except `web-push` and `@types/web-push`, on `^3.6`), Node 24 (`.nvmrc`). Vitest + Testing Library + `fake-indexeddb`; Vitest compiles StyleX through `@rolldown/plugin-babel`. **No e2e tests** (§7). `comlink` for worker messaging, `dexie-react-hooks` for `useLiveQuery`, `exif-reader` for photo details (D22). |
| D19 | Sync host | Sync runs in a **dedicated Web Worker** per tab. The page keeps reads and repo writes; the worker does push, pull/apply, SSE, polling, retries and weather (§4.6). |
| D20 | Location | The browser position (low accuracy, 10 s timeout, `maximumAge` 10 min) goes to the server, which turns it into a place with its zone (D13). Offered only with `geolocation`, a secure context and permission not `denied`. Failures: `denied`, `no-position`, `outside` (404), `lookup` (5 s limit, 5xx, network). The browser never calls a geocoder. |
| D21 | All-day events | `allDay: true`, `startAt` = the date's **UTC midnight**, no `endAt`, so the date never moves with the zone or DST. A day reads timed events in `[dayStart(key, tz), dayStart(key+1, tz))` plus all-day events at that UTC midnight. `eventDayKey(event, tz)` is the one place that reads an event's date. Server: `CHECK (NOT all_day OR end_at IS NULL)`. |
| D22 | Photo details | Read on upload, **on the server**: title (`ImageDescription`/`XPTitle`), date (`DateTimeOriginal`/`DateTimeDigitized`), GPS → `placeAt` → "City, ST". Fallbacks from pure `domain/photoName.ts`, then `x-file-modified`, then the upload day. Rows store `sources` and `checked`. Photos are editable (`PUT` title, date, place, sources, checked) and deletable (tombstone; files removed after commit). |
| D23 | Screens and QR | `GET /api/displays` lists the account's displays; a transport read, not synced. Kind and browser come from the `User-Agent` (`deviceOf`); the name is built from them, not stored. QR sign-in is the only user of `magic_links` (account + display ids, 3 min expiry) and `GET /api/auth/verify`; the code is drawn on the client with `uqr`. |
| D24 | Tags | **`tags` is a synced entity**, never renamed or recolored (a changing `PUT` is 409 `tag-changed`). Events store **`everyone boolean` + `tag_ids text[]`** (empty and not everyone = nobody), not a join table, so an event stays one row and a tag added later joins every everyone event. Names are unique per account ignoring case among live tags; a new id with a taken name answers the existing tag, and the engine moves the local id to it (two screens adding the same name offline). **Removing a tag** (FAM-08) in one `tx`: soft-delete it, delete events whose only tag it is, strip it from the rest; the last tag can't go (409 `last-tag`). Colors are 12 fixed names mapped to `--block-*`. Rules: `domain/tags.ts`, `domain/tagMatch.ts`. |
| D25 | Day timeline | **Pure layout in `domain/timeline.ts`**: `timelineLayout(plans, context, options)` returns rows, plan boxes, strips, "+N more" tiles, free slots and the now line with no DOM; `ui/DayTimeline` measures its card and renders it. Calendar and Today share it with different options. Overlaps are found after the minimum height, so a pushed-down short plan still gets its own column. A plan with no end takes 30 min. Rules: TL-*. |
| D26 | Breakpoints | **Three sizes**, `type Breakpoint = "large" \| "normal" \| "small"` in `domain/breakpoint.ts`: `breakpointFor(width)` → small at 768 px and below, normal up to and including 1200, else large (spec §5.1). `useBreakpoint()` reads the window width live (the sidebar doesn't count). Every layout record, component prop and test names these three; normal takes the large record unless the spec names normal. Box-width rules (card headers, week cells, timeline columns) measure the box with `ui/useBoxSize`, never the window. |
| D27 | Notes | **One paper tone:** a note has no color; the paper is the season's `soft` role. Limits are `NOTE_LIMITS` (D6). The board's 120-character cut (`domain/notes.boardText`) is derived, never stored. The last author posted from this screen is `meta.lastAuthor` in the account's Dexie database: per screen, never in the outbox. |
| D28 | Ambient brightness | `ambientBrightness` is `v.optional(…, "medium")`, so stored settings need no migration. Browsers can't set the backlight, so each level is an ink color token set as Ambient's root `color`, checked at 4.5:1 on every deep color in `theme/contrast.test.ts`. The burn-in drift (AMB-11) is pure, `driftOffset(driftStep(now))` over 8 fixed offsets, never a timer; the hint fades by CSS animation. |
| D29 | Reminders | Events carry `notify` (missing = on, NOTIF-09); settings carry one `notifyLead` (`"off" \| 15 \| 30`, default 15) and `chime`. Nothing about a reminder is stored on the client: `domain/reminders.ts` `remindersDue(events, lead, now, seen)` derives the due fires (start − lead for timed events with `notify` on, grouped by minute; a missed one counts until the start, NOTIF-02), and `seen` is tab state keyed `{eventId}:{fireAt}`, so a moved event or a changed lead fires again. There is no fire at the start. The shell's `ReminderHost` shows `ui/ReminderStrip` in a top layer outside the focus order, stops its pointer events so the idle and sidebar timers never see them, closes it 30 s after it shows (derived from `now`) and shows nothing during ambient hours. The chime is two Web Audio notes (`shell/chime.ts`), unlocked by the first `pointerdown`. |
| D30 | Web push | **`web-push`** with VAPID keys (§6.5; off when unset). One `push_subscriptions` row per browser, deleted with its display. The **reminder job** (§6.4, every minute) runs `remindersDue` per account on events one lead ahead (series expanded, D38) and records each fire in `reminder_sends` (`ON CONFLICT DO NOTHING`), so each push goes once and missed minutes never go late. 404/410 deletes the subscription. The service worker skips the notification while Glance is visible and opens only same-origin `data.url`. Push is per device and never syncs (NOTIF-08). |
| D31 | Revoked devices and account deletion | **Sign out all devices** and **Delete account** move the account's sessions to `revoked_sessions` and delete its displays in one transaction. `requireDisplay` answers **401 `revoked`** for such a token and the bus pokes open screens. Unlike a plain 401, which keeps the outbox (§5), `revoked` makes `/signin` run the full sign-out (§4.5). Delete account also erases the account's rows, freeing the email (SIGNIN-12); its photo files go to `photo_file_cleanup`, removed after commit and retried daily. |
| D32 | Photo storage | `photos.bytes` is the stored size of a photo's copies, written on upload. The limit is `PHOTO_STORAGE_GB` (§6.5, default 5) in decimal GB; an upload that would pass it is refused before anything is stored, 507 `storage-full`. `GET /api/photos/usage` → `{ used, limit }`, a transport read when Settings opens; `domain/storage.ts` `storageMeter` derives what the tile shows. |
| D33 | QR scanning | **`jsqr`** decodes Scan to sign in (SIGNIN-22), since iOS Safari has no `BarcodeDetector`: pure JS, no WASM or CDN, so it works offline. Only the frame's square of the rear-camera video is decoded, about every 150 ms. `linkToken(text, origin)` accepts only this origin's `/api/auth/verify?t=` links, sent to `POST /api/auth/verify`. |
| D34 | Terms page | `/terms` is a static page outside `(display)`, so it needs no session or providers: `app/terms/page.tsx` renders `features/terms/TermsScreen`, every word in `copy.terms`. Not in `OFFLINE_PAGES`. |
| D35 | Guide page | `/guide` is built like `/terms` (D34), every word in `copy.guide`. It is regenerated daily (`revalidate = 86400`) with `seasonFor("auto", new Date(), "UTC")`, so its colors follow the month without a client clock. Not in `OFFLINE_PAGES`. |
| D36 | Analytics | The root layout loads the Google tag (`gtag.js`, `next/script` `afterInteractive`) on every page when `NEXT_PUBLIC_GOOGLE_TAG_ID` is set at build time; unset (dev, tests) means no tag. Only Google's automatic page views are collected; no custom events, and no app content is ever passed to `gtag`. Disclosed in the Terms (TERMS-01). |
| D37 | Client error reporting | Screens never log to the console. Six catch points report to `POST /api/client-errors`, which logs as `source: "client"` in the server's journal and format (§6.6). No third-party error service or SDK. A crash outside a zone shows the crash screen, which reloads on its own (FAIL-04) unless it is the third in 10 minutes. |
| D38 | Weekly repeat | A series is **one stored row** (`repeat: "weekly"`, `startAt` the first week, no end date) plus `exdates`, the skipped local dates (EVT-14). Occurrences are never stored: `domain/repeat.ts` `occurrencesBetween` expands them on every read (same local minute in `tz`, so DST keeps the wall time), so views, reminders and the push job all see them. An occurrence keeps the series' `id`; reminders key fires by id and time, so each week reminds once. "This event" adds an exdate (a save also writes a detached one-time event); "the series" changes the row. |
| D39 | Import events | **Parsed on the server with `ical.js`** (zones, RRULE, EXDATE, RECURRENCE-ID), for Choose file and the phone alike. `parseIcs` is pure; floating times read in the account's zone; expansion stops 12 months ahead or after 50,000 rule steps (shortcut: a fixed budget; start the iterator near `now` if real files hit it). An upload is **staged** in `imports` and answered as the review; duplicates and attendee matches are derived on every read. **Commit** claims the row (`WHERE status = 'staged'`, so a second commit is 409), writes the events in one transaction with a server-only `import_id`, which makes **Undo** (24 h) exact. The phone's waiting screen polls `GET /api/imports/staged` every 3 s (shortcut: move to SSE if more flows need it). |
| D40 | API key | One key per account, for the public events API: read and write on the account's events, no other scope. The key is `glc_live_` + 32 base62 characters (~190 bits), shown once in the `POST /api/api-key` answer; the server stores only its SHA-256 and the last 4 characters (`api_keys`, `account_id` primary key, so a second create is 409 `exists`). Revoking deletes the row, so the key stops working at once; deleting the account deletes its key. |
| D41 | Export events | **Built on the screen, no request** (SET-18): pure `toIcs` in `domain/exportEvents.ts` writes the events not yet ended, times local to `tz`, all-day dates by UTC day (D21), series with `EXDATE`s, saved as a `text/calendar` Blob. Disabled offline (owner decision). |
| D42 | Reload app | **The version is `package.json`'s `version`** (SET-21), inlined at build (`APP_VERSION`); public `GET /api/version` answers the server's. Reload activates a waiting service worker (`SKIP_WAITING`) and loads `/today` without waiting for idle, since Dexie, the cookie and the outbox survive the load. |

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
│  Dexie glance-meta: {accountId, name, email, signedOut?, revoked?}, read first at boot
│  Shell providers: Now · Settings · TimeZone · Season · Network · SheetHost · WhoFilter · Idle
│  Service worker (Serwist): precache assets + route HTML/RSC, photo cache
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │ JSON over HTTPS, session cookie
┌─────────────────────── Next.js server (single Node process) ──────────────┐
│  src/app/api/**/route.ts  (thin: session → Valibot parse → service → JSON)│
│  server/services/*  ──▶  server/db port ──▶ postgres (pg │ PGlite)        │
│  server/bus  (in-process EventEmitter → SSE fan-out per account)          │
│  server/jobs (note expiry, cleanup, photo files, reminder pushes)        │
│  server/weather (Open-Meteo + Census)                                     │
│  server/mail: Mailer → Resend · Mailtrap · Mailgun · SMTP · Mailpit     │
│  server/storage: PhotoStore → disk {DATA_DIR}/photos · S3 · R2            │
│  server/push: web-push sender for reminders (D30)                         │
└───────────────────────────────────────────────────────────────────────────┘
```

**Rules**
- Screens never `fetch` app data. Every server call goes through the **transport** (`data/sync/transport.ts`), except error reports, which the reporter sends itself (§6.6).
- The sync worker never posts data to the page; data and sync status reach the UI through Dexie. Only `photosChanged` and `restart` are messages.
- The server is the source of truth; IndexedDB is a replica plus a queue of pending writes.
- Weather is read-through: the worker fetches it every 15 min and stores it for offline use.
- Auth screens reach the transport through `data/repos/auth.tsx` (`useSignInAuth`), not Dexie.
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
    terms/page.tsx                # public Terms of Service, no providers (D34)
    guide/page.tsx                # public Guide, no providers (D35)
    signin/                       # SignedOutProviders + SignInScreen
    dev/gallery/page.dev.tsx      # next dev only (§6.5)
    error.tsx  global-error.tsx   # CrashScreen (FAIL-04)
    sw.ts  serwist/[path]/route.ts  manifest.ts
    api/                          # route handlers (§6)
  domain/     # pure rules, Valibot schemas, Result, ids, time and zone helpers
  theme/      # StyleX tokens, seasons, themes, fonts
  ui/         # design-system components and shared pieces (Sheet, Page, Zone, crashReport, TimePicker, …); no data access
  copy.ts     # every user-facing string
  shell/      # AppShell, sidebar, providers/, SheetHost, SessionGuard, ReminderHost, ServiceWorker, OfflineNotice, ErrorReporter, CrashScreen, routes
  data/
    db.ts  meta.ts                # account Dexie DB, glance-meta DB
    repos/                        # RepoProvider, repos + hooks, session boot, service worker client, error reporter
    sync/                         # engine, status, worker, host, transport, httpTransport
    sw/rules.ts                   # SW rules shared with the page
  features/<view>/                # XScreen.tsx (container), components/, reducers, layout.ts
  features/gallery/               # /dev/gallery
  fixtures/   # shared test data
  server/     # 'server-only': db/ (Database port; postgres/ adapter, on `pg` or PGlite), auth/, services/, weather/, mail/, storage/, push/, jobs/, http.ts, env.ts, bus.ts, sse.ts, boot.ts, log.ts (logError, §6.6)
instrumentation.ts                # register() → bootServer() on the nodejs runtime; onRequestError → logError (§6.6)
db-migrations/NNN_*.sql
```

**Dependency rules** (Biome `noRestrictedImports` per folder, plus `server-only`). Cross-module imports use `@/`; imports inside a module are relative.

| Module | May import |
|---|---|
| `domain` | Valibot only (Biome blocks app modules, React, Next and Dexie) |
| `theme`, `ui` | `theme`, `domain` |
| `data` | `domain`; `fixtures` only in tests |
| `fixtures` | `domain` |
| `shell`, `features/*` | `ui`, `theme`, `domain`, `data/repos`, `shell`, `copy`. A feature may import another feature's **index** only |
| `server` | `domain`, and `copy` for the sign-in email and weather place names. Never `data`, `ui` or `features`. Outside `server/db`, never the database adapter (`server/db/postgres`): only the `server/db` port |
| `src/app/**` | pages and layouts → `features`, `shell`, `theme`, `copy` (and `domain`, as `/guide` does, D35); route handlers → `server` and `domain`; `sw.ts` → `serwist` and `data/sw` |

---

## 4. Client design

### 4.1 Local store (Dexie)
```ts
db.version(8).stores({
  events:   'id, startAt, deletedAt, repeat',   // + everyone, tagIds, notes, notify
  tags:     'id, createdAt, deletedAt',
  members:  null,
  notes:    'id, createdAt, deletedAt',
  photos:   'id, createdAt',
  settings: 'accountId',
  weather:  'accountId',
  outbox:   '++seq, entity, entityId',    // { seq, entity, entityId, op: 'put'|'delete', payload?, attempts }
  meta:     'key',                        // cursor, status, lastAuthor
});
```
- Each Dexie upgrade rewrites stored rows and waiting outbox payloads the way its server migration rewrites the tables (`members` → `tags`, `reminder` → `notify`, …), so both sides agree before the first pull.
- **One database per account** (`glance-{accountId}`), deleted on sign-out.
- Rows keep the server's soft delete (`deletedAt`); hooks filter it out.
- Pending ("Waiting to post") is derived from the outbox, never stored.
- Wire format = domain types (camelCase). Snake_case exists only in SQL.
- Range queries compare ISO strings; every stored timestamp is UTC `toISOString()`.

### 4.2 Repository pattern
Each repo has a small interface and one Dexie implementation (`createXRepo(store)` + a `useXRepo()` hook). A write is **one Dexie transaction** — the row plus an outbox entry — then `nudge()` once it commits. A put keeps the stored server fields (a new row gets version 0); a remove sets `deletedAt` locally and queues a delete. Settings are one row keyed by `accountId`, merged over defaults. Photo uploads skip the outbox (§6.3); photo edits and deletes use it.

Hooks are `useLiveQuery` reads (`undefined` while loading, deleted rows filtered; event reads take `tz` and include every weekly occurrence in the span, D38), so every view updates by itself after any write (EVT-07, FAM-05). `outbox.ts` `queued(store, tables, write)` runs several row writes and their outbox entries together.

`RepoProvider` takes a `RepoStore`: the account DB, the account, the clock, `nudge` and every server-backed action (uploads, places, displays, QR, push, imports, sign-out). The shell builds it; tests inject one.

**Transport.** Every server call is a `Transport` method returning `Promise<Result<T, TransportError>>`, with `TransportError` = `network` · `unauthorized` (401) · `revoked` (401 `revoked`, D31) · `invalid` (any other non-2xx: 400, 404, 409, …) · `outdated` (426) · `server` (5xx, 429, 403, non-JSON 2xx). Methods mirror the routes (§6.1): `push`, `pull`, `weather`, `places`, `locate`, `upload`, `displays`, `photoUsage`, `issueQr`/`voidQr`, `webPush.*`, `apiKey.*`, `imports.*` and `auth.*`, each adding its own error codes. Callers drop stale answers rather than cancel.
- `HttpTransport` talks to the same-origin API with fetch (XHR for upload progress) and sends `X-Glance-Build: {CLIENT_BUILD}` on every request. Bodies are trusted as typed.

### 4.3 Shell
| Provider | Holds |
|---|---|
| `NowProvider` | The app's only clock (1 s tick). `useNow("second" \| "minute" \| "day")` re-renders only when that unit changes; `useNowStore()` for effects. `frozenAt` (tests) freezes it until the first tap |
| `SettingsProvider` | Saved settings merged over defaults (+ `overrides`: the kept account's settings on Sign in, and tests). Renders nothing until the first read lands |
| `TimeZoneProvider` | `useTimeZone()` = the saved place's zone, else the device's (LOC-06) |
| `SeasonProvider` | Active season as a StyleX theme on a `display: contents` wrapper; re-checks at midnight |
| `NetworkProvider` | `online` (`navigator.onLine` and `meta.status.online`), `showOfflinePill` after 30 s, `savedAt` |
| `SheetHost` | One open sheet `{ kind, … }` (`event`, `newevent`, `note`, `newnote`, `photo`); closes on route change. `event` opens Event details (EVT-09) for the tapped occurrence's `day` (EVT-14); `newevent` carries the day, the person filter's people (EVT-11) and, from a free slot, its times (TL-08). The `edit`, `draft` and `discard` flags are for the gallery and tests only |
| `WhoFilterProvider` | The person filter (CAL-05, TODAY-04) for this tab: `"all" \| Set<id>` (`"all"` = every tag, also ones added later; empty = nobody), starting at `"all"`. Today and Calendar read and change the same value, always through `liveFilter` (FAM-05) |
| `IdleProvider` | Touch timer (`idleTimeout.minutes` while `idleTimeout.on`; off = never) → `/today`, or `/ambient` during ambient hours; enters and leaves Ambient on the schedule; paused while a text field is focused; applies a waiting update when idle (§4.5); `useOnIdle(listener)` runs the listener at each idle timeout, also when already on Today |

Nesting: Now → Repo → Settings → TimeZone → Season → Network → SheetHost → WhoFilter → Idle → SessionGuard. `DisplayProviders` wraps the views and `/ambient`, so moving to Ambient keeps the clock, DB and sync host. `/signin` uses `SignedOutProviders` (no account DB). `ErrorReporter` wraps every page in the root layout, outside both (§6.6).

**Boot** (`useDisplayBoot`) reads `glance-meta`: no entry or `signedOut` → `/signin`; else open `glance-{accountId}`, clear a halt left by the last session (`restarted` status event) and start the worker host.

**AppShell** owns the sidebar reducer (`shell/sidebar.ts`): `hidden | rail | expanded`, with `show`, `open`, `hide`, `close`, `back`, `idle` and `viewChanged`, each carrying `small` where it matters, so on small Rail is never reached (SHELL-08). The root pads by `sidebarInset(mode, small)`, so views and the offline pill follow the sidebar (SHELL-10). **Hide when idle** (SHELL-11): `useHideWhenIdle` checks `idleDue(lastActivity, now, 15)` on each Now-store tick, never while a sheet is open, the keyboard is up or a text field has focus; a frozen clock (tests) never fires it. Focus moves only after user actions (SHELL-09): handlers dispatch, then focus the grip or the Expand menu; no component focuses itself when it appears. The shell also paints the background (`useBackgroundImage` → `ui/PhotoBackdrop`), places the offline pill, pads by the keyboard inset while a field has focus (`useFieldInView`) and prefetches the six views.

**Background.** `domain/background.ts` `shownBackground(background, photos, now, tz, season)` derives what shows: `blank`, a season drawing (the picked one, else the current season; also when Photo or Slideshow has no photos), or a photo. The eight drawings are the handoff's `backgrounds/`, copied to `public/backgrounds/`; Ambient uses each one's `-night` file. Slideshow rotates from an anchor `photoId` by hours, days or Sunday weeks in `tz`, so every display shows the same photo with no timer; `changeBackground` re-anchors so the photo on screen stays.

**Signed-out screen** (SIGNIN-13). On `unauthorized`, `SessionGuard` marks the `glance-meta` entry `signedOut` and routes to `/signin` once no sheet is open and no field is focused. The outbox stays. On `revoked` (SIGNIN-18) it waits the same way and marks the entry `revoked` too; `/signin` then runs the full sign-out (§4.5), which deletes the outbox with the account DB, and shows the plain empty form. `/signin` reads the kept account's email, pending count and settings to show the notice and the different-email warning. On `/ambient` the notice shows in place and the wake tap goes to `/signin`.

### 4.4 Screens and components
Sizes, layout and words come from the handoff's layout pages and `copy.ts`; the code holds the props. This section keeps the rules that span files.

- **Container / presentational.** `features/*/XScreen.tsx` reads hooks, `useNow()` and `useTimeZone()` and passes plain props. `ui` components are pure (props + optional `xstyle`), get words as props (they can't import `copy`), and render `<button>` only when given `onClick`.
- **Rules are pure** in `domain` (`eventStatus`, `todayHero`, `timeline`, `dayList`, `todaySchedule`, `dayRibbon`, `tags`, `todaysPhoto`, `background`, `eventSentence`, `eventTimes`, `dayPreview`, `inAmbient`, `zoneState`, …) and unit-tested. Components hold no business rules; anything derived (statuses, counts, the photo of the day, recent titles, waiting notes) is computed, never stored.
- **Multi-state flows** are a discriminated union + reducer whose initial state the gallery and tests can set: sign-in (`features/signin`), QR scan (D33), the event page (`features/events/eventPage.ts`: `view | new | edit | closed`, asking `discard | delete`, series scope, D38), the note sheet, the photo sheet, the Import events page (`features/import/importPage.ts`), the Calendar view (selected day, 24 hours, date picker; tab-only), weather setup (shared by Weather, Settings › Location and the sign-in location step through `useWeatherSetup`), upload tiles, the slideshow (`playing | paused | pinned`), the QR tile, the sidebar (§4.3), the API key row, Refresh data, Reload app (D42), This phone (D30) and the delete-account dialog (D31). Discard changes? is one rule, `ui/discard.ts` `closeStep(asking, dirty, from)`.
- **Layouts.** Each feature's `layout.ts` maps the breakpoint (D26) to a StyleX grid; records hold `large` and `small` and are read through `layoutSize(breakpoint)` (normal → large unless the feature names normal, as Today does). Today's layout is a pure lookup, `todayLayout(breakpoint)`. Components that change with their own width (card headers, the week strip, Today's notes fit) measure themselves with `ui/useBoxSize`, never the window.
- **Day timeline and day list** (D25, CAL-10): `ui/DayTimeline` for Calendar and Today; on small both show `DayList` (exported from the calendar index), built from `domain/dayList.dayListGroups`. Free gaps come from one rule, `domain/timeline.freeGaps`, for both.
- **Person filter** (CAL-05): one tab-wide value in `WhoFilterProvider` (§4.3), read through `liveFilter`, shared by Calendar and Today; `ui/WhoFilter` (stack button + `WhoSheet` dialog) changes it.
- **Today's photo** (TODAY-07): `domain/todaysPhoto.ts` replays a seeded cycle day by day over every photo row, tombstones included, with "On this day" first, so every display shows the same photo with no stored pick; the background photo is skipped for today only. Photos store no dimensions or focal point: frames crop at the center, or 50% 30% once the loaded image measures portrait.
- **Event page** (EVT-*): `ui/Page` replaces `Sheet`: a full-screen `role="dialog"` above the nav, Escape = Back, that scrolls as a whole under its sticky `ui/PageTopBar` (EVT-01). `EventSheetScreen` owns the reducer and does the writes (`EventsRepo.put(eventFromDraft(…))` before `saved`; a new member through `TagsRepo.add` at once, so a Discard keeps the tag). Recent titles and places are derived from local events (EVT-12).
- **Sheets** (§8.9 of the spec): `ui/Sheet` keeps header and footer outside the scrolling body. `useFocusOnOpen` focuses a `[data-autofocus]` field when there is one, else the dialog, and returns focus on close.
- **Slideshow** index is derived from an anchor and `now` (8 s per slide), never a timer; background rotation works the same way (§4.3).
- **Uploads** run one XHR per file through `PhotosRepo.upload`; tiles live in memory, pause offline and resume or restart on reconnect.
- **Keyboard** (KB-*): `useKeyboardInset()` reads `visualViewport`; sheets shrink above it. `useFieldInView(area, inset)` returns the padding its caller applies and scrolls the focused field into view with the pure `domain/keyboard.ts` `revealDelta(field, label, viewport)`: on `focusin`, again 350 ms later and on each `visualViewport` resize; nearest scroller first, then outer ones, then the window. Without `visualViewport` it does nothing.
- **Ambient transition** (AMB-10): every navigation to or from `/ambient` goes through `shell/useAmbientNavigate.ts`, which runs the leave half with Web Animations, pushes the route, and lets the arriving root run the enter half; taps are dropped while it runs. Reduced motion or no `Element.animate` → push at once.
- **Accessibility**: `PillTabs` is a `<fieldset>` of `aria-pressed` buttons; `Sheet` and the date picker are `role="dialog"` with focus trap and return (`ui/dialogFocus.ts`); `onAccent` is black except in Winter (4.5:1, checked by `theme/contrast.test.ts`); reduced motion zeroes `durBase` and `durSeason`.

**Zone state** (LOAD-\*, FAIL-\*, OFF-\*). Local reads don't fail, so a zone's state describes freshness. `zoneState({ rows, everSynced, failed, lastSyncedAt, timedOut })` is pure; **ever synced** = a pull cursor exists in `meta`, and `timedOut` comes from `loadingTimedOut(since, now)`.

| State | When |
|---|---|
| `loading` | No local rows, never synced, for up to 10 s |
| `failed` | No local rows, never synced, and the pull failed or took over 10 s |
| `empty` / `ready` | Ever synced, or local rows exist. `ready` carries `updatedAt` when the last sync failed |

Weather uses `weatherZone({ located, weather, failed, timedOut })` over `status.weather`: `empty` without a location, `ready` with a saved forecast. `shell/sourceZone.ts` turns these into `{ state, retryIn, retry }`. Every zone renders through `ZoneState<T>` + `<Zone>`, which has its own error boundary.

### 4.5 Offline boot and caching
A signed-in screen must cold-start offline with every view working.

- **Static routes.** Every view, `/ambient` and `/signin` is fully static (no `cookies()`/`headers()`); auth gating is on the client; `useSearchParams` sits in `Suspense`. `/` → `/today` is a `redirects()` entry.
- **Auth offline.** `glance-meta` holds `{ accountId, name, email, signedOut?, revoked? }`, written after sign-in. Offline, trust it; online, a 401 means signed out. Signing in to a different account first deletes the old account's DB and `photos` cache.
- **Photos offline.** After each pull, and at start for every saved photo, the worker sends `photosChanged(ids)`; the page forwards them to the SW, which fetches `thumb` and `display` into the `photos` cache one at a time.
- **Storage.** `navigator.storage.persist()` after sign-in. Manifest: `display: fullscreen`, `start_url /today`, the handoff's `pwa-icons/` copied to `public/`. Home-screen install on iPad avoids Safari's 7-day cap.
- **Updates.** A new SW waits. At an idle move with an empty outbox, `IdleProvider` posts `SKIP_WAITING` and loads the target path on `controllerchange`; the SW is checked hourly. **Build check:** every route behind `syncReader` or `syncWriter` (`/api/sync`, entity writes, weather, displays, photo usage, push, QR, location) answers **426** when `X-Glance-Build` is missing or below `MIN_CLIENT_BUILD`. After a 426 the outbox can't drain, so the update applies at the next idle even with entries pending; they survive the reload and the new build pushes them. Without a waiting SW, an `outdated` screen does a full page load at idle instead. **Daily reload:** `IdleProvider` notes when the page loaded; an idle move 24 h or more later (`reloadDue`, `domain/idle.ts`) loads the target path in full (FAIL-05). Any change that adds a field to a synced row raises `CLIENT_BUILD` (`domain/build.ts`) and `MIN_CLIENT_BUILD` (`server/http.ts`), because Valibot drops unknown keys and an older client would write the row back without it. New settings fields use `v.optional(…, default)`, so older rows parse.
- **Sign-out.** Stop the host (terminates the worker), call `auth.signout()` (answer ignored; skipped after `revoked`), clear `glance-meta`, delete the account DB and the `photos` cache, and unsubscribe this browser's push subscription. Sign out all devices calls `auth.signoutAll()` first and stays in the dialog on a failure; Delete account calls `deleteAccount()` the same way (D31).

| Request | Strategy |
|---|---|
| `/_next/static/*`, fonts, icons, manifest, `public/**` | Precache; other `/_next/static/*` CacheFirst `assets` |
| Route HTML | Cached on SW activate (`OFFLINE_PAGES`) + NetworkFirst 3 s → cache → `/today` |
| RSC (`RSC: 1`) | NetworkFirst 3 s, cached by path + segment header, `_rsc` ignored |
| `/api/photos/{id}/file` | CacheFirst `photos` + warming, 300 entries |
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
| page → worker | `start(accountId, page)`, `nudge()`, `resync()`, `refreshWeather()`, `refreshNow()`, `ping()`, `stop()` |
| worker → page | `photosChanged(ids)`, `restart()` |
| worker → `meta.status` | `{ online, lastSyncedAt?, error?: 'unauthorized' \| 'revoked' \| 'server' \| 'outdated', retryAt?, weather: idle \| loading{since} \| failed{retryAt} }` |

**Code.** `engine.ts` holds all logic with no Worker/DOM APIs and runs anywhere; `worker.ts` adds the lock, SSE, polling and outbox watch with injectable deps; `sync.worker.ts` only exposes it with Comlink; `host.ts` spawns it.

**Rules**
- **Serial runs.** `nudge()` = drain the outbox (re-read by `seq` before each push, no in-memory copy), then pull. One queue, so an entry is never pushed twice.
- **Pending rows win.** Push answers and pulled rows are written only when no outbox entry remains for that row.
- **Errors** follow §5. `unauthorized` / `revoked` / `outdated` halt the engine and keep the outbox. `network` / `server` keep the entry, bump `attempts`, and retry on the FAIL-03 schedule (`retryDelayMs`: 1, 2, 5, then every 5 min).
- **One active worker per browser:** only the `glance-sync` lock holder syncs. It nudges on a new outbox entry from any tab, on each SSE ping and stream reopen, on `online`, and every 30 s while the stream is closed and no retry is waiting.
- **Refresh now** (SET-20): `refreshNow()` runs `nudge()` and `refreshWeather()` together and answers whether the sync succeeded (`false` before the worker holds the lock; the host answers `false` with no worker or when the call rejects). Only the sync result counts; a weather failure shows in its own zone.
- **Weather** refreshes at start, every 15 min, on `refreshWeather()` and `refreshNow()`, and right after a sync that brings a new location (once its settings push is accepted). Failures retry on the FAIL-03 schedule.
- **Timeouts.** Every transport request aborts after 60 s (`REQUEST_TIMEOUT_MS`) and fails as `network`, so a hung request can't hold the queue.
- **Watchdog.** The host calls `ping()` every 60 s; one unanswered within 10 s means the worker died or froze, so the host terminates and respawns it on the same account.
- **Schema upgrades:** on `versionchange` the worker stops and posts `restart`; the page respawns it after its own upgrade. The worker never blocks an upgrade.
- The worker never touches `navigator.serviceWorker`; the page forwards photo ids.

---

## 5. Sync protocol

**Push.** The engine drains the outbox in `seq` order, one request at a time: `PUT /api/{entity}/{id}` (full row, idempotent upsert) or `DELETE /api/{entity}/{id}`. On 2xx it removes the entry and saves the returned row only if no other entry for that row remains. Errors:
- **401** → keep the outbox, stop syncing, sign the screen out (§4.3). **401 `revoked`** → stop syncing, then the full sign-out deletes the outbox with the account DB (D31).
- **Any other 4xx** (400, 404, 409, 413, 415) → drop the entry, delete the local row if nothing else is pending, and pull from scratch to restore the server's copy.
- **426** → keep the outbox, stop syncing, update at the next idle (§4.5).
- **Network / 5xx / 429 / 403** → keep the entry and retry with backoff and on reconnect. 403 is the Origin check (a screen opened at an address other than `APP_URL`), so the change waits instead of being dropped.

**Pull.** Every write bumps a global `sync_state.version` in the same transaction and copies it to the row. `GET /api/sync?since={cursor}` returns `{ cursor, changes: [{ entity, row }] }` for the account's tags, events, notes, photos and settings with `version > since`, tombstones included. The client applies them in one transaction, skipping rows with a pending outbox entry.

**Versions commit in order.** Every write runs in a `Database.tx`, and transactions run one at a time (D7: every `tx` takes the `sync_state` row lock first), so version *n* commits before *n + 1* is handed out by `stamp()`. A no-op write bumps nothing. `pullChanges` reads in one transaction too, so it never sees a write half done. So a cursor never skips a version.

**Conflicts** (SYNC-03)
- **Delete wins.** A `PUT` on a tombstone returns the tombstone unchanged.
- **Settings are one row.** The last write replaces the whole JSON.

**Triggers.** `GET /api/sync/stream` (SSE) sends `data: {"version":n}` when the account changes, with a `: heartbeat` every 25 s and nothing on connect. The bus is an in-process EventEmitter keyed by account. The stream has no build check (`EventSource` can't send headers); the pull that follows does.

---

## 6. Server design

### 6.1 Route handlers
`runtime = 'nodejs'`. Steps: Origin check (writes only) → build check (426; the sign-in routes `code`, `code/verify`, `verify`, `status`, `name`, `signout` and `signout-all`, `DELETE /api/account`, and `client-errors`, skip it) → session (`requireDisplay`, 401; `client-errors` doesn't need one) → Valibot parse (400) → service → map the `Result` to JSON. Errors are `{ error: code }` with 400/401/403/404/409/413/415/426/429/502/507. No middleware for auth. Helpers in `server/http.ts`; handlers import service indexes, never `server/db`. Body schemas live in `domain/schemas.ts` with the text limits of D6, so the client fields and the server agree; query and header parsers are in `server/http.ts`.

| Route | Notes |
|---|---|
| `PUT/DELETE /api/{tags,events,notes,photos}/{id}`, `PUT /api/settings/{accountId}` | Body is the domain schema (server fields stripped, body id = path id). Answers the stored `Synced<T>`. `DELETE` sets `deleted_at` and keeps the content; a tag `DELETE` cascades to its events (D24, 409 `last-tag`). Another account's id → 404. Photos are only created by upload, so `PUT` doesn't insert and changes only title, date, place, sources and `checked` |
| `GET /api/sync`, `GET /api/sync/stream` | §5 |
| `POST /api/photos`, `GET /api/photos/{id}/file?v=` | §6.3 |
| `GET /api/weather` | The account's forecast; 409 `no-location`, 502 `weather-failed` |
| `GET /api/weather/places?q=` | `WeatherLocation[]` (empty = unknown place); 502 `weather-failed` |
| `GET /api/weather/locate?lat=&lon=` | Place with its zone; 404 outside the US, 502 `weather-failed` |
| `GET /api/displays` | The account's displays, this one first, then by `last_seen_at` |
| `GET /api/photos/usage` | `{ used, limit }` in bytes (D32) |
| `GET /api/push/key`, `PUT/DELETE /api/push/subscription` | VAPID public key (404 when push is off); this display's subscription `{ endpoint, keys: { p256dh, auth } }` (D30) |
| `GET/POST/DELETE /api/api-key` | The account's API key (D40). `GET` → `{ tail, createdAt, lastUsedAt }` or 404; `POST` → 201 `{ key, tail, createdAt, lastUsedAt }` with the full key, the only time it is sent, or 409 `exists`; `DELETE` revokes it → 204, 404 when there is none |
| `/api/v1/events`, `/api/v1/events/{id}` | The public events API (D40, API-*), §6.8 |
| `DELETE /api/account` | Deletes the account and revokes every device (D31); 204 |
| `/api/auth/*` | §6.2 |
| `POST /api/imports`, `GET /api/imports/staged`, `GET /api/imports/last`, `POST /api/imports/{id}/commit`, `POST /api/imports/{id}/undo` | Import events (D39). `POST` takes the raw `.ics` body like a photo (413 past 5 MB) and an optional `?forDisplay=`, and answers 201 with the review or 400 `not-ics` \| `no-upcoming`. `staged` → this display's newest staged import of the last hour, else 404. `commit { who }` → the result; 409 when not staged, 400 `unknown-tag`. `last` → the last import, else 404. `undo` → 204; 409 `too-late` (24 h) or `not-done`. Another account's import → 404 |
| `GET /api/version` | Public, no session: `{ version }` (`package.json`'s), `no-store` (D42) |
| `POST /api/client-errors` | A screen's error report, logged as `client` (§6.6); 204, also when rate-limited |

Every accepted write is announced on the sync bus. A tag `PUT` with a name already used by a live tag of the account (ignoring case), or changing an existing tag, → 409. Event tag ids are filtered as D24. Settings are validated by `AccountSettingsSchema`. TPK-07 (at least 5 minutes, same day) is a client rule; the server checks only `endAt > startAt` and a span under 24 h for timed events.

### 6.2 Auth (SIGNIN-*)
1. `POST /api/auth/code { email, timeZone }` → 204. Email trimmed and lowercased; the email's older code is replaced (only the newest works); same answer whether the account exists. Limits: 5 per email and 20 per IP per 10 min (in memory) → 429. Failed send (`mail-failed`) → 502.
2. `POST /api/auth/code/verify { email, code }` → `signed-in { account, returning, setupDone }` with a new display and session cookie, creating the account if new (`time_zone` from the code row) and deleting the row. Otherwise 400 `wrong-code` (tries counted), `code-locked` (the 5th wrong try, or any try after it) or `code-expired` (≥ 10 min, or no live code: an unknown email reads the same). 30 per IP per 10 min → 429. Codes compare in constant time.
3. `GET /api/auth/verify?t=` (QR links only, D23) → 303 to `/signin?link=opened` with a session for the opening device, or `/signin?link=stale` (unknown, used, voided or past its expiry: 3 min, 10 for an import code). The link is read, checked and marked used in one transaction, so two scans at once sign in one device. A Photos or Import link opens that page instead of Today. `POST /api/auth/verify { t }` (Scan to sign in, D33) runs the same check and answers like a code verify, or 400 `link-stale`. `GET /api/auth/status`: a valid session → `signed-in { account, returning, setupDone }`, else `signed-out` (a revoked token too; the device learns `revoked` from its next sync).
4. `POST /api/auth/name { name }` saves the name (≤ 100 chars) and, when the account has no tag yet, creates the first tag with that name and the first color in the same transaction. `POST /api/auth/location` saves the SIGNIN-14 place or a skip and sets `accounts.setup_done_at`.
5. `POST /api/auth/signout` deletes this display's session, display row and push subscription. `POST /api/auth/signout-all` revokes every session of the account and removes its screens (D31), clears the cookie and answers 204; this screen then signs out like a plain sign-out and opens `/signin?toast=signed-out-all`.
6. `POST /api/auth/qr` makes a one-time QR link for this display (voiding its older one; 30/hour); an optional body `{ opens: "photos" | "import" }` adds where the link opens; an import link lasts 10 minutes, others 3 (`qrTtlMs`, shared by the server's expiry and the client's countdown). `DELETE /api/auth/qr { url }` voids it. A stale QR never reveals the account email.

`requireDisplay` resolves the session cookie to `{ displayId, accountId }` and stamps `last_seen_at`. Displays store `kind` and `browser` from the `User-Agent`.

**Mailer** (`server/mail/`). Auth takes a `Mailer` in its deps and never sees a provider.

```ts
type MailMessage = { to: string; subject: string; text: string; html?: string };
type Mailer = { send(message: MailMessage): Promise<Result<void, "mail-failed">> };
```

- **Sign-in email**: `signInMessage(to, code, season)` → `{ to, subject, text, html }`, the HTML being the handoff's `emails/sign-in-code.html` as a template, every word from `copy.signIn.email`, the email HTML-escaped. `season` is the account's fixed season, else `seasonFor("auto", now, timeZone)`.
- **Contract**: the sender is bound from `MAIL_FROM` when the mailer is built. Any failure is `mail-failed`, never a throw. One attempt, no retry. A failure is logged once (`mail/send-failed`, §6.6) with the provider and status, never the message or the provider's answer (they hold the code).
- **Adapters and factory** (`server/mail/`): Resend, Mailtrap and Mailgun share one `postMail` step over `fetch`; SMTP and Mailpit use `nodemailer` through a minimal `SmtpTransport` type. `createMailer(config, from, fetch)` switches on `config.provider`; `mailer()` builds it once from `env()`.
- **Tests**: one contract suite (accepted → `ok`; rejected or unreachable → `mail-failed` without throwing; logs never hold the message) runs against every adapter on a fake `fetch` or transport.

### 6.3 Photos
`POST /api/photos` takes one file per request as the raw body (XHR, so progress is real): `Content-Type`, `Content-Length`, URI-encoded `x-file-name`, optional `x-file-modified` (ISO date). The server runs `uploadProblem` on the declared type and size, reads the body into memory stopping at 20 MiB (`20 × 1024 × 1024` bytes; 413 `too-large`), decodes it and makes the two WebP copies with `sharp` in memory (415 `not-a-photo`), reads details (D22), checks the account's storage (D32; 507 `storage-full` before anything is stored), puts the two copies in parallel as `image/webp`, then inserts the row with its `bytes` and the next version and answers 201. A failed upload removes its objects and leaves no row. The upload queue is in memory on the client; it isn't kept across reloads.

`GET /api/photos/{id}/file?v=display|thumb` (session only, no build check since `<img>` can't send headers) streams the object through the server (so session auth and the SW photo cache stay same-origin) with its stored content type, `Cache-Control: private, max-age=31536000, immutable` and `nosniff`; 400 `invalid` for any other `v` (including `orig`), 404 for a tombstone or a missing object. `DELETE` removes the two objects and any old `.orig` after commit; a failed remove is retried by the daily job.

**Photo store** (`server/storage/`). Services and jobs take a `PhotoStore` in their deps and never see paths or buckets.

```ts
type StoredObject = { body: ReadableStream<Uint8Array>; size: number; contentType: string };
type PhotoStore = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Result<StoredObject, "not-found">>;
  remove(keys: string[]): Promise<void>;
};
```

- **Contract** (`store.ts`): keys are `{file_path}.{variant}`. `remove` of a missing key succeeds, and `remove` settles every key before it throws (both adapters use `allSettled`). Only `not-found` is a `Result`; disk and network failures throw (500).
- **Adapters and factory** (`server/storage/`): `createDiskStore(root)` under `{DATA_DIR}/photos`; `createS3Store(config, fetch)` signs single-request calls with **`aws4fetch`** (SigV4) for AWS S3 and S3-compatible hosts; `r2` is the S3 store on `https://{accountId}.r2.cloudflarestorage.com`. `photoStore()` builds one from `env()`.
- **Tests**: one contract suite (put then get, missing key → `not-found`, idempotent `remove`) runs against the disk store on a temp dir and the S3 store on an in-memory fake bucket.

### 6.4 Jobs
`bootServer()` (from `instrumentation.ts`) prepares the database (`prepareDatabase()`: PostgreSQL migrates), exits on failure, then `startJobs()`: an hourly `unref` timer plus a tick at boot; daily jobs run on the first tick of each UTC day; a second `unref` timer runs the reminder job every minute. A failing job is logged with its name (`job/job-failed`, §6.6) and doesn't stop the others: `createJobTick({ hourly: { expireNotes, removeStagedImports }, daily: { cleanupSignIns, removeDeletedPhotoFiles, cleanupReminderSends } })` guards each one, and each job's name is its key there (the production server bundle is minified, so function names aren't kept). The start-up photo jobs (`removePhotoOriginals`, `backfillPhotoBytes`) and the minute's `sendReminderPushes` log failures the same way. Jobs run across accounts.
- **Note expiry** (hourly): tombstones notes older than the account's `noteExpiry.days` while it is on, using the screens' `noteExpired` rule, then publishes each account's version on the bus.
- **Code and link cleanup** (daily, `cleanupSignIns`): deletes `sign_in_codes` and `magic_links` expired more than 24 h ago, and `revoked_sessions` older than 400 days (the cookie's life).
- **Deleted photo files** (daily): removes the stored objects of tombstoned photos not yet marked `files_removed`, and marks each one removed, then the files listed in `photo_file_cleanup` (deleted accounts, D31), deleting each row once removed; one photo's failure doesn't stop the rest and is logged on its own (`job/cleanup-failed` with the `photoId`, §6.6).
- **Staged imports** (hourly, `removeStagedImports`): deletes `imports` rows still `staged` an hour after `created_at` (D39).
- **Reminder pushes** (every minute, D30): sends each due reminder once to the account's push subscriptions and prunes gone ones. Reminder sends older than a day are deleted by the daily cleanup.

`accountTimeZone(db, accountId)` = the saved place's `timeZone`, else the account's; the upload-day fallback reads it. Backups belong to the PostgreSQL host.

### 6.5 Config
`server/env.ts` parses `process.env` on first use (`env()`, then cached): the database chosen by `DB` (read into `env().database`), `APP_URL`, `MAIL_FROM` (`Name <address>` or a bare address, checked as an address), the mail provider chosen by `MAIL_PROVIDER` (read into `env().mail`) the photo store chosen by `PHOTO_STORE` (read into `env().storage`), `PHOTO_STORAGE_GB` (a positive number, default 5; D32) and the optional push keys `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:` or `https:`; all three or none, D30). All are listed in `.env.example`. The three choices are Valibot `variant`s:

| `DB` | Variables |
|---|---|
| `postgres` (default) | `DATABASE_URL` (`postgres://…`) |
| `memory` | none; an in-process PGlite, gone after a restart |

| `MAIL_PROVIDER` | Variables |
|---|---|
| `resend` (default) | `RESEND_API_KEY` |
| `mailtrap` | `MAILTRAP_API_TOKEN`, optional `MAILTRAP_INBOX_ID` (sandbox inbox) |
| `mailgun` | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, optional `MAILGUN_REGION` (`us` default, `eu`) |
| `smtp` | `SMTP_HOST`, optional `SMTP_PORT` (587), `SMTP_SECURE` (`true`: TLS from connect, as on 465; else STARTTLS when offered), `SMTP_USER` and `SMTP_PASSWORD` (both or neither) |
| `mailpit` | optional `MAILPIT_HOST` (`localhost`), `MAILPIT_PORT` (`1025`) |

| `PHOTO_STORE` | Variables |
|---|---|
| `disk` (default) | `DATA_DIR` |
| `s3` | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT` (S3-compatible hosts) |
| `r2` | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |

Bad config names the variables (not their values) and exits. `next build` needs no env. `.env.development` points at a local PostgreSQL, `.data/` and a local Mailpit (`MAIL_PROVIDER=mailpit`); sign-in emails are read at `http://localhost:8025`.

**`next dev`** signs in, syncs and sends mail through the server like production, without the service worker. Dev-only routes are `page.dev.tsx` (`/dev/gallery`), added to `pageExtensions` for `next dev` only.

### 6.6 Error logging
Every error, on the server or on a screen, is **one JSON line on stderr**, written only by `logError(source, event, error, context?)` in `server/log.ts`; screens send theirs to the server (**Client errors** below). It is the only file in `src/server` and `src/app/api` that may use `console` (Biome `noConsole`, with an override for `log.ts`). No log service: the server runs under systemd, so the journal stores, stamps and rotates the lines.

**Where errors are logged.** Once, at the step that turns a thrown error or a bad answer into a `Result` error code (`getJson`, `mailFailed`, the push sender, the photo store calls); code that only passes the `Result` on never logs it again. Uncaught throws are logged by three catch points only: `onRequestError` in `instrumentation.ts` (every request error Next reports), `runSafely` in `jobs/schedule.ts` (with the job's name, §6.4) and `bootServer` (then exit). The `pg.Pool` has an `error` listener (`db/pool-error`), and a failed `ROLLBACK` is logged (`db/rollback-failed`) while the original error is rethrown. Upstream failures never log the URL or body values, which can hold the family's coordinates. Next.js also prints its own plain-text line for an uncaught route error; the `jq` recipes below skip it.

**Line format.** Keys in this order:

| Key | | Value |
|---|---|---|
| `level` | always | `"error"` |
| `time` | always | ISO 8601 UTC with ms, `2026-10-26T14:03:11.482Z` |
| `source` | always | from the table below |
| `event` | always | kebab-case, from the table below; never renamed, so searches keep working |
| context | optional | only the keys below |
| `error` | always | `{ name, message, code?, stack?, cause? }`; `cause` has the same shape, at most 2 levels; a string becomes `{ name: "Error", message }` |

| `source` | `event` | Context |
|---|---|---|
| `route` | `request-failed` | `method`, `route`, `digest` |
| `job` | `job-failed`, `cleanup-failed` | `job`, `photoId` (cleanup) |
| `boot` | `start-failed` | — |
| `db` | `pool-error`, `rollback-failed` | — |
| `mail` | `send-failed` | `provider`, `status` |
| `weather` | `fetch-failed`, `bad-status`, `bad-response` | `host`, `status` |
| `push` | `send-failed` | `status` |
| `storage` | `remove-failed` | `accountId`, `photoId` |
| `photos` | `decode-failed` | `accountId` |
| `client` | `zone-crashed`, `page-crashed`, `uncaught`, `worker-crashed`, `outbox-watch-failed`, `sw-crashed` | `page`, `build`, `component`, `digest`, `occurredAt`, `timeZone`, `accountId`, `displayId`, `ip`, `browser`, `device`, `userAgent` |

A new failure kind adds its row here first. Context keys are only these (the `logError` type allows no others), and each is safe by construction: `route` is Next's `routePath` (`/api/events/[id]`), never the real path, whose query can hold a token; `host`, never the full URL, which holds the coordinates; `page` is `location.pathname`, never its query; `ip` has the last IPv4 octet zeroed (an IPv6 /48); `userAgent` is cut to 300 characters; `accountId`, `displayId`, `ip`, `browser`, `device` and `userAgent` come from the request or session, never the report body. `digest` ties a server `request-failed` line to the screen's `page-crashed` report; `occurredAt` is when the screen caught the error, which differs from `time` for a report that waited offline.

**Privacy.** `error` is copied field by field from the list above, so pg's `detail` (row values), a `WebPushError`'s `endpoint`, `headers` and `body`, and provider answers never reach the log. Email addresses in `message` and `stack` become `[email]` (SMTP errors name the recipient), and `message` is cut at 500 characters. Never logged: full IP addresses, emails, sign-in codes, session or QR tokens, push endpoints or keys, mail content, coordinates, event, note or photo text, request bodies, query strings.

**Client errors** (D37). Nothing on a screen logs to the console; it reports to the server, which logs the report as `source: "client"`.
- **Reporter** (`data/repos/clientErrors.ts`): `createErrorReporter(…)` builds the report (`event`, `error`, `page`, `build`, `component`, `digest`, `occurredAt`, `timeZone`) and sends it with `fetch(…, { keepalive: true })`, cutting strings to the route's caps. Per page load (and per worker) and per hour: one report per error (same message and first stack frame), at most 20. Offline, reports wait in memory. It never throws. It is the only code that calls the route (`src/clientErrorGuard.test.ts`).
- **Catch points** (only these): `ZoneBoundary` → `zone-crashed`; `app/error.tsx` and `app/global-error.tsx` render `shell/CrashScreen` (FAIL-04), which reports `page-crashed` once; `shell/ErrorReporter` → `uncaught` for the window's `error` and `unhandledrejection`; the sync worker → `worker-crashed` and `outbox-watch-failed`; `app/sw.ts` → `sw-crashed`. `ui` can't import `data`, so `ui/crashReport.ts` holds a context that `shell/ErrorReporter` fills. Expected failures (network, permissions, cache steps) are `Result`s or quiet catches, not reports.
- **Route** `POST /api/client-errors` (§6.1): `Origin` check, no build check (old builds are the ones that crash) and no session needed, so `/signin` reports too. `ClientErrorSchema` caps every string. `logClientError` takes the account and display from the session (else the IP), allows 30 reports per 10 min per display or IP, and logs through `logError` with the same privacy rules. It answers 204 whether logged or limited, so the screen never retries.
- **Stacks**: `productionBrowserSourceMaps` is on (the source is public on GitHub), and `*.map` files stay out of the service worker precache (its `globPatterns` list no `.map`). To read a minified stack, check out the commit for the line's `build` and resolve it with `npx source-map-cli`.

```json
{"level":"error","time":"2026-10-26T14:03:11.482Z","source":"route","event":"request-failed","method":"PUT","route":"/api/events/[id]","error":{"name":"Error","message":"Connection terminated unexpectedly","stack":"Error: Connection terminated…"}}
```

**Reading the log** on the server (the unit is called `glance` here; use yours). systemd sends stdout and stderr to the journal; `-o cat` drops the journal's own prefix, and `jq -R 'fromjson?'` keeps only the JSON lines, so Next's plain-text lines and anything else are skipped. Pick the time with `--since` / `--until` (`"1 hour ago"`, `"2026-10-26 08:00"`, `today`) or `-b` for since the last boot.

```bash
# One readable line per error
journalctl -u glance -o cat --since today | jq -Rr 'fromjson? | select(.level == "error") | "\(.time)  \(.source)/\(.event)  \(.route // .job // .provider // .host // "-")  \(.error.message)"'

# Follow new errors live
journalctl -u glance -o cat -f | jq -Rr --unbuffered 'fromjson? | select(.level == "error") | "\(.time)  \(.source)/\(.event)  \(.error.message)"'

# A stack trace with real line breaks
journalctl -u glance -o cat --since today | jq -Rr 'fromjson? | select(.event == "request-failed") | .time, .route, .error.stack, ""'

# One household's errors
journalctl -u glance -o cat --since today | jq -R --arg id "<accountId>" 'fromjson? | select(.level == "error" and .accountId == $id)'
```

How long the journal keeps lines is set by `SystemMaxUse=` (size) or `MaxRetentionSec=` (age) in `/etc/systemd/journald.conf`.

### 6.7 Database
PostgreSQL, from `db-migrations/`:

| Table | Columns |
|---|---|
| `accounts` | `id`, `email citext UNIQUE`, `name`, `time_zone` (the first browser's zone), `setup_done_at` (first-run location step ended), `created_at` |
| `displays` | `id`, `account_id`, `last_seen_at`, `kind` (`monitor` default), `browser` |
| `sessions` | `token_hash`, `display_id`, `created_at` |
| `revoked_sessions` | `token_hash`, `revoked_at`: sessions ended by Sign out all devices or Delete account, so their device learns it was revoked (SIGNIN-18) |
| `sign_in_codes` | `email` (primary key: one live code per email), `code_hash`, `time_zone`, `tries` (0–5), `expires_at` |
| `magic_links` | `token_hash`, `account_id`, `display_id` (QR links, SIGNIN-15), `expires_at`, `used_at` |
| `tags` | `id`, `account_id`, `name`, `color`, `created_at`, `updated_at`, `deleted_at`, `version` |
| `events` | `id`, `account_id`, `title`, `start_at`, `end_at` (`> start_at`), `all_day` (no `end_at` when true), `location`, `everyone`, `tag_ids text[]` (empty when `everyone`; empty and not `everyone` = nobody), `notes`, `notify` (default `true`), `repeat` (`weekly` or null, D38), `exdates text[]` (local dates a series skips, default empty, D38), `import_id` (null unless imported, D39), `updated_at`, `deleted_at`, `version` |
| `imports` | `id`, `account_id`, `for_display_id` (phone uploads, IMP-04), `status` (`staged` · `done` · `undone`), `file_name`, `bytes`, `parsed jsonb` (the parsed events while staged), `who` (`everyone` or a tag id), `count`, `first_day`, `last_day`, `created_at`, `imported_at` |
| `notes` | `id`, `account_id`, `text`, `author`, `rotation`, `created_at`, `updated_at`, `deleted_at`, `version` |
| `photos` | `id`, `account_id`, `title`, `taken_on date`, `place`, `title_source`, `date_source`, `place_source`, `checked`, `file_path`, `files_removed` (D12), `file_name`, `bytes` (stored size of its copies, SET-13), `created_at`, `updated_at`, `deleted_at`, `version` |
| `settings` | `account_id`, `json jsonb` (AccountSettings), `updated_at`, `version` |
| `push_subscriptions` | `id`, `account_id`, `display_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at` (NOTIF-07) |
| `reminder_sends` | `event_id`, `kind` (the lead it fired at: `15min`, `30min`), `fire_at`, `sent_at`: pushes already sent, so each goes once (NOTIF-07) |
| `api_keys` | `account_id` (primary key: one key per account), `key_hash` (SHA-256 of the key, unique), `tail` (its last 4 characters), `created_at`, `last_used_at` (D40) |
| `photo_file_cleanup` | `file_path`, `created_at`: files of a deleted account still to remove (SET-14) |
| `weather_cache` | `account_id`, `location` ("lat,lon"), `json`, `fetched_at` |
| `sync_state` | the one global `version` counter |

Timestamps are `timestamptz` (ISO-8601 UTC strings on the wire), dates `date`. Ids: D8. Stamping, versions and soft deletes: §5. Photo files: D12.

### 6.8 Public events API (API-*)
Behavior and answers: spec API-*. Bearer key instead of the session, so no Origin check (no cookies to ride on) and no build check. `apiAccount` (`server/http.ts`) → `requireApiKey` (`server/auth/apiKeys.ts`): the header must be `Bearer glc_live_` + 32 base62, else 401; the key's hash is counted on an in-memory limiter (60 a minute per key → 429 `limited` with `Retry-After`); then `apiKeys.use(keyHash, now)` stamps `last_used_at` and answers the account in one `UPDATE … RETURNING`, so a revoked key fails at once. Bodies parse with `ApiEventInputSchema` / `ApiEventPatchSchema` (400 `{ error: "invalid", field }`). CORS (API-09) is set in `next.config.ts` `headers()` for `/api/v1/:path*`; the preflight is Next's automatic 204.

`server/services/apiEvents.ts` (`listApiEvents`, `readApiEvent`, `createApiEvent`, `changeApiEvent`, `deleteApiEvent`) maps the API's event JSON to `CalendarEvent` and saves through `events.putEvent` / `events.deleteEvent`, announced on the bus like any write, so screens, sync and reminders see a normal event. Local days use `accountTimeZone` (LOC-07); `who` names map to live tags ignoring case; a `PATCH` is the stored event with the patch spread over it, rebuilt as a create, keeping `notify` and `importId`.

---

## 7. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/domain`; server services, auth and jobs run on a fresh migrated PGlite DB per test, each with a cross-account test; `databaseContract` on the adapter; recorded Census answers |
| Component | Vitest + Testing Library | `ui` and feature components: clicks, validation, ARIA |
| Data / sync | Vitest + `fake-indexeddb`, stubbed `fetch` / `EventSource` | Repos (row + outbox in one transaction), `engine.ts` (push order, backoff, 401 keeps the outbox, `revoked` clears local data, pending rows skipped, tombstones, weather retries), worker lock and restart |
| Time zone | Vitest with `TZ=Asia/Kolkata` | `zone.ts` across DST in several zones; every rule that reads a day or hour runs in a zone other than the device's |

Checks: `biome check` → `tsc --noEmit` → Vitest → `next build`. GitHub CI (`.github/workflows/ci.yml`) runs them on demand only for now; run them locally before each merge to `main`.

**Manual checks** on a production build, before each release and every Next upgrade: visual parity with the handoff's layout pages (`*-layout.dc.html`) at the three sizes (1920×1080, 1024×768, 390×844); offline cold start with every view and synced photo (OFF-06); two screens syncing, offline replay, delete wins, polling fallback (SYNC-01..03); a 401 with a change waiting, then signing in with the same and another email (SIGNIN-13, SIGNIN-11); a new build applied on an idle screen (OFF-07).
