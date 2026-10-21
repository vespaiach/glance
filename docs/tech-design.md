# Glance — Technical Design

| | |
|---|---|
| Status | v2.47 |
| Date | 2026-10-21 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.74) · [`design/handoff/`](design/handoff/README.md) (v11) |

The spec says **what** the app does (requirement IDs like `SYNC-02`); this document says **how**. On conflict, the spec wins on behavior and this document on implementation.

---

## 1. Decisions

| # | Area | Decision |
|---|---|---|
| D1 | Framework | **Next.js App Router, run as a SPA.** A persistent client shell in `(display)/layout.tsx` keeps the clock, idle, slideshow and sync timers alive across views. Views are `'use client'` segments. |
| D2 | Language / lint | TypeScript `strict`, Biome (lint + format, pre-commit and the §7 checks). |
| D3 | Styling | **StyleX** via Babel + PostCSS (`useCSSLayers: true`); `globals.css` holds only `@stylex;`. Tokens in `theme/` (`tokens.stylex.ts`, `type.stylex.ts`, `seasons.stylex.ts`), seasons and Ambient as `createTheme` in `themes.ts`. Components use `season.*` roles directly. Geist / Geist Mono are vendored woff2 loaded with `next/font/local`. `ui/Icon` wraps `lucide-react` and takes the glyph component, not a name. |
| D4 | Client data | **Local-first store on IndexedDB (Dexie).** The UI reads local data only; writes go local first; a sync engine in a Web Worker (D19) talks to the server. |
| D5 | Shell state | React context + `useSyncExternalStore` stores. No state library. |
| D6 | Validation | **Valibot** schemas in `domain/schemas.ts` are the single contract for client and server; types come from `v.InferOutput`. `SyncedXSchema` adds `updatedAt`, `version`, optional `deletedAt`. IDs are UUIDs, timestamps ISO-8601, dates `YYYY-MM-DD`. Schemas never transform. The event schema checks `endAt > startAt` and a span under 24 h. Weather icons are a closed set of Lucide kebab names that `ui` maps to components. `DEFAULT_SETTINGS` in `domain/defaults.ts`. |
| D7 | Database | **PostgreSQL** via `pg` with raw SQL behind a small `Db` interface (`all`, `one`, `run`, `exec`, `tx`; nested `tx` joins the outer one). Tests run on **PGlite** (`server/db/pglite.ts`). `timestamptz` → ISO string, `bigint` → number, `date` stays `YYYY-MM-DD`. Migrations are `db-migrations/NNN_*.sql`, applied at boot by `migrate()` (one transaction each, tracked in `schema_migrations`). Every service is `async` and takes the `Db`. Server tests get a fresh migrated PGlite DB per test (`migratedDbPerTest`). |
| D8 | IDs | **UUIDv7 generated on the client** (`domain/id.ts`). Offline creates need no remapping. Server-made ids (accounts, displays, photos) are UUIDv7 too. |
| D9 | Sync | Outbox push + versioned pull. SSE only says "something changed"; 30 s polling is the fallback (§5). |
| D10 | Conflicts | Last write **to reach the server** wins. The server stamps `updated_at` and `version`. |
| D11 | Auth | **Emailed 6-digit code** typed on the screen that asked for it (QR links stay, D23); opaque session token in an httpOnly cookie. A code is `crypto.randomInt(0, 1_000_000)` zero-padded; only `sha256(email + ":" + code)` is stored, one live row per email in `sign_in_codes` (a new send replaces it), 10 min life, 5 tries, then the row is dead. `verifyCode` locks the row (`FOR UPDATE`), checks expiry first (an expired or missing row is `code-expired`, even when locked), then the try count, then compares the hashes with `timingSafeEqual`; a wrong try bumps `tries` in the same transaction. Codes come from `AuthDeps.newCode`, so tests pass fixed ones. Session tokens and QR tokens are 32 random bytes (base64url); only their sha256 is stored. No polling and no `pending` or `link_email` cookies: the verify answer signs the screen in. Migration `008_sign_in_codes.sql` creates `sign_in_codes`, deletes the email rows of `magic_links` and drops its `kind`, `email`, `time_zone` and `pending_id` columns (and the shape check), making `account_id` and `display_id` required. Cookie: `session` (400 days, `HttpOnly; SameSite=Lax; Path=/`, `Secure` on https) (§6.2). |
| D12 | Photos | Three objects per photo, keyed `{account}/{id}.{orig|display|thumb}` (`photos.file_path` holds `{account}/{id}`), in a **`PhotoStore`**: local disk, AWS S3 or Cloudflare R2, picked by `PHOTO_STORE` (§6.3, §6.5). **`sharp`** makes WebP display (≤ 2560 px) and thumb (≤ 640 px) copies, upright by EXIF; the original is kept byte for byte. Raster formats `sharp` decodes are accepted; SVG is refused. |
| D13 | Weather and places | **Open-Meteo** forecast + geocoding behind `WeatherProvider`; **US Census Geocoder** behind `PlaceLocator` for reverse lookup. Both via `getJson` (8 s timeout, Valibot parse, any failure → `weather-failed`). Forecast cached per account for 15 min (`weather_cache`). Place search is US only, keeps names matching the query (a ZIP keeps all), requires a valid IANA zone, at most 5. `locatePlace` rounds to 2 decimals and asks the Census place and the Open-Meteo zone in parallel. |
| D14 | Email | A **`Mailer`** (`send` answers `Result<void, "mail-failed">`) with one adapter per provider, picked by `MAIL_PROVIDER`: **Resend**, **Mailtrap** and **Mailgun** over their HTTP APIs with plain `fetch`, and **SMTP** with **`nodemailer`** (dev sends to a local Mailpit). Every provider sends from `MAIL_FROM`. One attempt, no retry or fallback provider (§6.2, §6.5). |
| D15 | Time | No date library: `Intl.DateTimeFormat` + pure helpers in `domain/time.ts`, `week.ts` and `zone.ts`. "Local" means the **screen's time zone** `tz` (the saved place's zone, else the device's), never the device's: every helper that reads hours or dates takes `tz` last. `zone.ts` converts wall time ↔ instant (`wallTime`, `zonedInstant`, DST-safe: a skipped time moves forward, a repeated one is the earlier instant) and days (`dayNumber`, `dateKey`, `dayStart`, `addDays`). A date with no time (day key, `takenOn`, forecast day, month cell) is a UTC-midnight `Date` formatted in UTC. Formatters take minutes of the local day. `localZoneGuard.test.ts` bans local-zone `Date` getters in `src`; Vitest pins `TZ=Asia/Kolkata`. |
| D16 | Offline shell | **Serwist** PWA: precache build assets, fonts and public files; cache route HTML on activate and RSC payloads as fetched; NetworkFirst (3 s) for navigations and RSC; CacheFirst for photo files with warming; NetworkOnly for other `/api/*`. New versions activate only when idle (§4.5). |
| D17 | Runtime | **One Node process** (`next start`) behind HTTPS, with PostgreSQL at `DATABASE_URL` and photos in a persistent `DATA_DIR` (`disk`) or an S3 or R2 bucket. Migrations run at boot. One process is required by the in-process SSE bus. |
| D18 | Tooling | npm with exact pins, Node 24 (`.nvmrc`). Vitest + Testing Library + `fake-indexeddb`; Vitest compiles StyleX through `@rolldown/plugin-babel`. **No e2e tests** (§7). `comlink` for worker messaging, `dexie-react-hooks` for `useLiveQuery`. |
| D19 | Sync host | Sync runs in a **dedicated Web Worker** per tab. The page keeps reads and repo writes; the worker does push, pull/apply, SSE, polling, retries and weather (§4.6). |
| D20 | Location | The browser position (`devicePosition`: low accuracy, 10 s timeout, `maximumAge` 10 min) goes to the server, which turns it into a place with its zone (D13). Offered only with `geolocation`, a secure context and permission not `denied`. Failures: `denied`, `no-position`, `outside` (404), `lookup` (5 s limit, 5xx, network). The browser never calls a geocoder. |
| D21 | All-day events | `allDay: true`, `startAt` = the date's **UTC midnight**, no `endAt`, so the date never moves with the zone or DST. Repos read a day as timed events in `[dayStart(key, tz), dayStart(key+1, tz))` plus all-day events at that UTC midnight. `eventDayKey(event, tz)` is the one place that reads an event's date. Server: `events.all_day` with `CHECK (NOT all_day OR end_at IS NULL)`. |
| D22 | Photo details | Read on upload, **on the server**: title (`ImageDescription`/`XPTitle`), date (`DateTimeOriginal`/`DateTimeDigitized`), GPS → `placeAt` → "City, ST". Fallbacks from pure `domain/photoName.ts` (`nameFromFile`, `dateFromFile`), then `x-file-modified`, then the upload day. Rows store `sources` and `checked`. Photos are editable (`PUT` title, date, place, sources, checked) and deletable (tombstone; files removed after commit). |
| D23 | Screens and QR | `GET /api/displays` lists the account's displays (`kind`, `browser`, `lastSeenAt`, `current`); a transport read, not synced. Kind and browser come from the `User-Agent` (`domain/screens.ts` `deviceOf`); the name is built from them, not stored. QR sign-in is the only user of `magic_links` (account + display ids, 5 min expiry) and `GET /api/auth/verify`; the code is drawn on the client with `uqr`. |
| D24 | Tags | **`tags` is a synced entity** like notes (`PUT /api/tags/{id}` only; tags are never deleted, renamed or recolored, so there is no `DELETE` and a `PUT` of an existing id with another name or color is refused, 409 `tag-changed`; the same `PUT` again answers the stored row and bumps nothing). Pulled by `/api/sync` as entity `tags`. Events store **`everyone boolean`** plus **`tag_ids text[]`** (empty when `everyone`; empty and not `everyone` = nobody), not a join table, so an event stays one row on the wire and in the outbox; a tag added later joins every `everyone` event with no rewrite. Tag colors are a closed set of 12 names mapped to the design system's `--block-*` colors in `theme`, never season roles. The server keeps `tag_ids` honest: an event `PUT` drops ids that aren't live tags of the account (so another account's ids never stick); an event left with none is stored as nobody. A tag `PUT` with a name a live tag of the account already has (ignoring case) is refused (409 `name-taken`); a partial unique index on `(account_id, lower(name))` backs it. The first tag is created with the name (`POST /api/auth/name`), with a UUIDv7 id and the first color. Migration `009_tags.sql` renames `members` → `tags` and `events.member_ids` → `tag_ids` (indexes and constraints too), drops tombstoned tag rows, and bumps one version per account so screens pull the new entity; the shape change raises `CLIENT_BUILD` and `MIN_CLIENT_BUILD` (§4.5). Pure rules (`domain/tags.ts`): `whoLabel`, `eventColor`, `nextFreeColor` (the New member tile's preselected swatch: first unused, else the first), `matchesFilter(event, selected, allIds)` (CAL-05: tags in common; everyone events while any tag is selected; nobody events only when every tag is), `toggleFilter` (adds or removes one id; a filter left with every tag becomes `"all"`), `liveFilter` (a Calendar filter against the live tags → the selected ids: `"all"` selects every tag, new ones included; gone ids drop), `filterTagIds` (a new event's people `{ everyone, tagIds }` from the filter in tag order; everyone when all are selected, nobody when none are), `whoValue(ids, allIds)` (a Who draft → `{ everyone, tagIds }`, every tag = everyone, also when there are no tags yet; ids not yet in `allIds`, like a tag just added, stay on), `whoIds(event, allIds)` (an event's people → the Who draft's ids; everyone = every tag) and `exactTag(tags, input)` (the tag with that trimmed name, any case). `domain/tagMatch.ts` `suggestTags(tags, input, exclude)` ranks EVT-11's fuzzy matches (prefix → word prefix → contains → subsequence → one edit with 3+ characters against the name's prefix of the input's length or the whole name, on names folded by case, accents (đ → d), spaces and hyphens; ties keep tag order). Events have no color of their own; person dots are `ui/PersonDot` (a tag color or the season soft color). |
| D25 | Day timeline | **Pure layout in `domain/timeline.ts`**: `timelineLayout(plans, { day, now, tz }, { span: "day" \| "24h", height, passedFactor, minPlanHeight })` with no DOM. `plans` are the day's timed plans, already filtered by the person filter. It returns `rows` (hour weights per TL-02 and TL-06, tops and heights scaled to the height), `marks` (hour lines with label and hairline thinning, TL-01, TL-06), `plans` (top, height with the 44/40 px minimum, `column` / `columns` / `columnSpan` per TL-03, `startsBefore` when clipped at 5 AM), `freeSlots` (TL-08, with the New event `start`/`end`), `now` (TL-09) and `hiddenOutsideSpan` (CAL-06; 0 on 24 hours). A plan with no end takes 30 min on the timeline. Overlaps are found on pixel boxes after the minimum height, so a short plan pushed down by it still gets its own column. `DayTimeline` measures its card with a `ResizeObserver` and passes the height; the card's content tier (TL-04) is picked from its measured size. Calendar and Today pass different options (`passedFactor` 0.35 / 0.3, rain chips on Calendar off phone, filter); both show gutter weather (TL-07). The Calendar's 24 hours link count (CAL-06) uses `outsideDay(plans, tz)`. Today's `TodaySchedule` renders the all-day tiles and a `today` timeline for everyone, filling its card (min 200 px, 560 px in the stacked layout). |

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
│  server/jobs (note expiry, code/link and photo-file cleanup)              │
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
    signin/                       # SignedOutProviders + SignInScreen
    dev/gallery/page.demo.tsx     # demo builds only (§6.5)
    sw.ts  serwist/[path]/route.ts  manifest.ts
    api/                          # route handlers (§6)
  domain/     # pure rules, Valibot schemas, Result, ids, time and zone helpers
  theme/      # StyleX tokens, seasons, themes, fonts
  ui/         # design-system components and shared pieces (Sheet, Page, Zone, TimePicker, …); no data access
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
| `domain` | Valibot only (Biome blocks app modules, React, Next and Dexie) |
| `theme`, `ui` | `theme`, `domain` |
| `data` | `domain`; `fixtures` only in `data/sync/fixtureTransport.ts`, `data/repos/session.ts` and tests |
| `fixtures` | `domain` |
| `shell`, `features/*` | `ui`, `theme`, `domain`, `data/repos`, `shell`, `copy`. A feature may import another feature's **index** only |
| `server` | `domain`, and `copy` for the sign-in email and weather place names. Never `data`, `ui` or `features` |
| `src/app/**` | pages and layouts → `features`, `shell`, `theme`, `copy`; route handlers → `server` and `domain` schemas; `sw.ts` → `serwist` and `data/sw` |

---

## 4. Client design

### 4.1 Local store (Dexie)
```ts
db.version(4).stores({
  events:   'id, startAt, deletedAt',   // + everyone, tagIds, notes
  tags:     'id, createdAt, deletedAt',
  members:  null,
  notes:    'id, createdAt, deletedAt',
  photos:   'id, createdAt',
  settings: 'accountId',
  weather:  'accountId',
  outbox:   '++seq, entity, entityId',    // { seq, entity, entityId, op: 'put'|'delete', payload?, attempts }
  meta:     'key',                        // cursor, status
});
```
- The v3 upgrade copies `members` into `tags` (live rows) and renames each event's `memberIds` to `tagIds`, also in waiting outbox payloads; waiting member puts become tag puts and member deletes are dropped; the v4 upgrade rewrites the stored settings, and any waiting settings put, as `010_settings_values.sql` does. The server migrations do the same, so both sides agree before the first pull.
- **One database per account** (`glance-{accountId}`), deleted on sign-out. Demo builds use `glance-fixture`, reseeded on each load.
- Rows keep the server's soft delete (`deletedAt`); hooks filter it out.
- Pending ("Waiting to post") is derived from the outbox, never stored.
- Wire format = domain types (camelCase). Snake_case exists only in SQL.
- Range queries compare ISO strings; every stored timestamp is UTC `toISOString()`.

### 4.2 Repository pattern
Each repo has a small interface and one Dexie implementation (`createXRepo(store)` + a `useXRepo()` hook). A write is **one Dexie transaction** — the row plus an outbox entry — then `nudge()` once it commits. A put keeps the stored server fields (a new row gets version 0); a remove sets `deletedAt` locally and queues a delete. Settings are one row keyed by `accountId`, merged over defaults. Photo uploads skip the outbox (§6.3); photo edits and deletes use it.

Hooks are `useLiveQuery` reads (`undefined` while loading, deleted rows filtered): events by day, week or span (`useEventsOnDay`, `useEventsInWeek`, `useEventsBetween`) in `tz`, `useEvent`, `useNextEventAfter`, `useUpcomingEvent`, `useHasEvents`, `useTags` (oldest first), `useNote`, `useNotes(now)` (newest first, expired hidden, `waiting` derived), `usePhotos`, `usePhoto`, `usePhotoSrc`, `usePictureOfDay`, `useSettings`, `useWeather`, `useSyncStatus`, `useSourceStatus`, `useRetry`, `useSignedOut`, `useOutboxEmpty`. So every view updates by itself after any write (EVT-07, FAM-05). `TagsRepo.add(tag)` is the only tag write; `outbox.ts` `queued(store, tables, write)` runs several row writes and their outbox entries together.

`RepoProvider` takes a `RepoStore` (`db`, `accountId`, `account`, `now`, `startedAt`, `nudge`, `refreshWeather`, `photoSrc`, `upload`, `places`, `locate`, `displays`, `issueQr`/`voidQr`, `signOut`, `markSignedOut`). The shell builds it; tests inject one.

**Transport.** Every server call is a `Transport` method returning `Promise<Result<T, TransportError>>`, with `TransportError` = `network` · `unauthorized` (401) · `invalid` (any other non-2xx: 400, 403, 404, 409, …) · `outdated` (426) · `server` (5xx, 429, non-JSON 2xx). Methods: `push(entry)` → `Change`, `pull(cursor?)` → `{ cursor, changes }`, `weather`, `places(query)`, `locate(coords)` (adds `outside`), `upload(file, modifiedOn, onProgress)` (adds `too-large` / `not-a-photo`), `displays`, `issueQr`/`voidQr`, and `auth.*` (`sendCode`, `verifyCode`, `status`, `guestAvailable`, `guest`, `name`, `location`, `signout`). Callers drop stale answers rather than cancel.
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
| `SheetHost` | One open sheet `{ kind, … }`; closes on route change. `event` opens Event details (EVT-09); `event` and `newevent` take a `time` from the `time=` fixture; its `edit` flag opens Edit event directly and is only set by the `sheet=event\|allday\|past` fixtures without `details=1` (an ended event still opens details). `note` opens Note details (NOTE-10); its `edit` flag opens Edit note directly and is only set by the `sheet=note` fixture without `details=1`. `newevent` carries the day and the Calendar filter's people as `who: { everyone, tagIds }` (EVT-11; absent = everyone) and, from a free slot, its `times` (minutes of the day from `domain/eventTimes.slotTimes`, TL-08; absent = TPK-05 defaults). `newnote` opens New note (its `draft` comes only from the `sheet=newnote` fixture). `photo` opens a photo's details by id. `discard` (any kind) opens with Discard changes? up |
| `IdleProvider` | Touch timer (`idleTimeout.minutes` while `idleTimeout.on`; off = never) → `/today`, or `/ambient` during ambient hours; enters and leaves Ambient on the schedule; paused while a text field is focused; applies a waiting update when idle (§4.5) |

Nesting: Now → Repo → Settings → TimeZone → Season → Network → SheetHost → FixtureParams → Idle → SessionGuard. `DisplayProviders` wraps the views and `/ambient`, so moving to Ambient keeps the clock, DB and sync host. `/signin` uses `SignedOutProviders` (no account DB).

**Boot** (`useDisplayBoot`): demo opens and reseeds `glance-fixture` with an inline host and `FixtureTransport`. Otherwise it reads `glance-meta`: no entry or `signedOut` → `/signin`; else open `glance-{accountId}`, clear a halt left by the last session (`restarted` status event) and start the worker host.

**AppShell** owns the sidebar reducer (`shell/sidebar.ts`): `hidden | rail | expanded`, with `show` (grip), `open` (expand handle), `hide` (rail ✕), `close` (drawer Close), `back` (Escape, drawer row, scrim), `idle` (any → hidden) and `viewChanged` (expanded → rail; hidden → rail except on Today). Initial state: rail on every view but Today; `rail=1|open` override. `show`, `back` and `viewChanged` carry `phone`: on a phone (`useBreakpoint() === "phone"`) `show` goes straight to expanded, `back` and every view change to hidden, and the initial state is hidden (`rail=open` still expands), so Rail is never reached; AppShell also reads a `rail` left over from a resize as hidden, and renders no Rail or Expand handle. The grip takes `phone` (40 px touch area, 4×56 pill, "Open menu") and the drawer its phone sizes and scrim. After `close`, `back` and a drawer row, focus goes to the grip on a phone. The root pads by `sidebarInset(mode, phone)` (phone: always 0, the drawer overlays the page). **Hide when idle** (SHELL-11): `useHideWhenIdle` checks `idleDue(lastActivity, now, 20)` on each Now-store tick and sends `idle`, only while `settings.hideSidebarWhenIdle` is on. The last activity is the latest `pointerdown`, `keydown` or `focusout`, and every tick with a focused text field; the timer starts afresh whenever the sidebar leaves Hidden (`show`) or a pause ends. It doesn't run while `SheetHost` has a sheet or the keyboard inset is non-zero. A frozen fixture clock never fires it. Focus moves only after user actions (SHELL-09): the handlers dispatch, then focus the grip (`hide`, `close`) or the Expand menu (`show`, `back`); no component focuses itself when it appears, so `idle` moves no focus. The shell also paints the photo background (`useBackgroundPhoto` → `ui/PhotoBackdrop`, cross-fading layers), places the offline pill (`OfflineNotice`), pads by the keyboard inset, and prefetches the six views.

**Background rotation.** `domain/background.ts` `shownBackground(background, photos, now, tz)` derives the photo: in Slideshow, `photoId` is the rotation anchor and `rotationStep` counts hours, days or Sunday weeks in `tz`, so every display shows the same photo with no timer. `changeBackground` re-anchors so the photo on screen stays. Photo mode with no or an unknown photo falls back to the oldest upload.

**Fixture params** (spec §6) are parsed once in `fixtures/params.ts`, only in demo builds, and become provider options, seed options or reducer initial states. An offset-less `now=` is a Pacific wall time.

**Signed-out screen** (SIGNIN-13). On `unauthorized`, `SessionGuard` marks the `glance-meta` entry `signedOut` and routes to `/signin` once no sheet is open and no field is focused. The outbox stays. `/signin` reads the kept account's email, pending count and settings to show the notice and the different-email warning. On `/ambient` the notice shows in place and the wake tap goes to `/signin`.

### 4.4 Screens and components
- **Container / presentational.** `features/*/XScreen.tsx` reads hooks, `useNow()` and `useTimeZone()` and passes plain props. `ui` components are pure (props + optional `xstyle`), get words as props (they can't import `copy`), and render `<button>` only when given `onClick`.
- **Rules are pure** in `domain` (`eventStatus`, `todayHero`, `timeline`, `tags`, `pictureOfDay`, `inAmbient`, `zoneState`, …) and unit-tested. Components hold no business rules.
- **Multi-state flows** are a discriminated union + reducer, with the fixture param as initial state: event and note sheets (`step: details | editing | deleting | discarding`; `details` holds only the `opened` draft and ignores every action but Edit, the edit steps carry the draft, `opened`, field errors and `fromDetails`, the event sheet's also the open `picker`, and only `discarding` carries `discardTo`; an edit leaves `discarding` for `editing` and keeps `deleting`; Cancel and Save from an edit opened in details return to `details`; Discard changes? via `ui/discard.ts` `closeStep(asking, dirty, from)`; and Event details read the reducer's `opened` draft so a Save shows the new values at once, with the pill from `domain/eventStatus.detailsStatus` (`now | ended | null`) and the time from `domain/time.rangeParts`; the note sheet has the same steps, renders one `Sheet` for both views so the sticky-note fill, 6 px radius and tilt (`domain/notes.noteDetailsTilt`, ±1.5°) ease to the flat edit sheet over 280 ms, and `useNote` carries `waiting` for the "Waiting to post" time; the event draft's Who is `tagIds`, the pills in order (an everyone event opens with every tag through `whoIds`, so `EventSheetScreen` opens a sheet only once `useTags` has loaded) and Save stores `whoValue(tagIds, allIds)`; the edit steps also carry `whoInput` and `newColor` (the picked swatch, `null` = `nextFreeColor`), which never make the draft dirty; a "New member" Add writes the tag through `TagsRepo` at once (`createdAt` = now) and puts it on the draft, so a Cancel keeps the tag), the Calendar view (`features/calendar/calendarView.ts`: selected day (`undefined` = today), filter `"all" | Set<id>` (`"all"` = every tag, also ones added later; else the selected tags, empty = nobody), `span24`, `picker` (the phone date picker is open; picking a day or Today selects and closes it, Close and the scrim only close it); tab-only, so it lives in `CalendarScreen` and resets when the view changes; `?date=` wins over the `day=` fixture, `who=`, `span=24` and `dp=open` set the rest; the filter is always read and tapped through `liveFilter`, so a new tag joins an everyone filter (FAM-05); the week strip comes from `domain/week.ts`: `weekDays`, `stepWeek` (CAL-02), `weekHeading` (the year and month name of the week's Saturday), `weekDots` (always everyone), `readDateParam` and `pickerMonths` (CAL-03: the months from 2 before to 3 after today's month; the picker's dots come from `useEventsBetween` over that span, read only while it is open); on phone `DateControl` replaces `WeekStrip`, which then takes only `wide | mid | narrow`), photo sheet, weather setup (`editing | searching | choosing | locating | confirm-zone`, shared by Weather, Settings › Location and the sign-in location step through `useWeatherSetup`), sign-in, upload tiles, slideshow (`playing | paused | pinned`), full-screen photo, QR tile, sidebar.
- **Layouts.** Each feature's `layout.ts` maps the breakpoint (`useBreakpoint()`, spec §5.1) to a StyleX grid. Today uses `todayLayout(width, height)` → `stacked` (< 1024 px) · `portrait` · `twoColumn` (1024–1180 px landscape) · `threeColumn`, plus `noteColumns` and `noteLimit` (TODAY-09, TODAY-13); `threeColumn` fits the window with no scroll and scales type by `min(width ÷ 1920, height ÷ 1080)` clamped to 1–1.5, and the Now panel sizes the Clock, temperature and title with container units. Calendar is a flex column: week strip, then the panel (`CalendarToolbar`: filter pills and Add event; all-day tiles, `DayTimeline`, then `SpanLink`, the CAL-06 24 hours text link with `aria-pressed`, passed to `CalendarDay` as its `spanLink` slot and shown only with the timeline); it fills `main` (`height: 100%`) on wide, mid and narrow, and with 24 hours on, or on phone, it takes `min-height: 100%` and the timeline's own minimum (760 / 720 / 760 / 1000 px; 320, phone 720, with 24 hours off) so the page scrolls (CAL-04). `ui/useBoxSize` (a `ResizeObserver` hook) measures the timeline card and the week strip's day grid (CAL-01's 124 px forecast rule).
- **Day timeline** (D25): `ui/DayTimeline` renders `timelineLayout(…)` for Calendar and Today; the reflow animates `top` and `height` over 280 ms. Props: the day's timed `plans` (already filtered), `tags`, `day`, `now`, `tz`, `clock`, `variant: "calendar" | "today"` (passed factor 0.35 / 0.3; rain chips on Calendar only), `breakpoint` (gutter, title size, 40 px plans and no rain chips on phone), `span`, `free: "everyone" | "some" | "none"` (slot label; none = nobody selected), optional `weather: { hourly, unit }` (gutter weather at every size; Calendar passes it on phone too), `labels` (`copy.timeline` + `copy.events.now`/`everyone` + `copy.weather.icon`), `onOpenEvent(id)` and `onAddEvent({ start, end })`. It measures its own box with a `ResizeObserver` (640 × 640 until measured). Card rules stay pure in `domain/timeline.ts`: `planCard({ width, height, titleSize, badge, note })` picks the TL-04 content (one line, range or start time, 1–2 title lines, who · where, notes), `planRain(start, end, rainByHour)` the TL-07 chip, `gutterWeather(mark, rowHeight, nowTop)` the TL-07 gutter weather; `domain/weather.hourlyByHour(hourly, day, tz)` keys the forecast by hour of that day. Free-slot lengths use `formatDuration` ("1 h 15 min").
- **Now panel** (`features/today`: `TodayHero` with `NowWeather` and `HeroSummary`). `todayHero(events, now, tz)` returns `now` (the running event that started last, ties to the one ending first, an open-ended one last; `left` = minutes to its end rounded up, none without an end), `next` (`in` = minutes to its start, rounded up), `ended` (`done` = timed events today) or `none`; `hasEvent(hero)` narrows to `now` / `next`. Those two render `HeroSummary`; the open day (`ended`, `none`; TODAY-13) renders `OpenDay`: title and line, the ribbon and the "Next on the calendar" tile. `domain/dayRibbon.dayRibbon(events, now, sunset, tz)` returns `elapsed` (percent of 6 AM to 10 PM, also the marker position), `left` (minutes to 10 PM), `sunset` (percent, absent without a forecast or outside the ribbon) and `ended` segments (`start`, `width` in percent; timed events that ended, at least 20 min wide, cut to the ribbon). The sunset comes from the forecast's `current.sunset` and only its time of day counts. The tile line is `features/ambient`'s `eventLine` for `useNextEventAfter(day, tz)`; it hides while loading, empty or failed. `domain/weather.rainHour(hourly)` is the first `cloud-drizzle` or `cloud-rain` hour for "Rain from {time}" (`rainStart`, the 50% rule, stays for the Weather view's banner). The panel is an inline-size container: the Clock reads `clockSize` from a theme set on its block, the temperature and title use `cqi` sizes directly.
- **Picture of the day** is its own panel (`PictureOfDayPanel` with `PictureOfDay`, `PictureOfDayEmpty` or `PictureOfDaySkeleton`), shown on every background, with the `display` variant filling it (min 240 px outside `threeColumn`). `pictureOfDay(rows, dayKey, tz, seed)` replays a seeded cycle day by day over all photo rows (tombstones included), with "On this day" first, so the pick is stable for every display. Tap → `/photos?photo={id}`, which opens the slideshow pinned and paused on it.
- **Sign-in** (SIGNIN-*): the reducer's steps are `form | sending | sent | checking | locked | expired | name | location | done` (plus `ended` from SIGNIN-13). `sent` carries the email, `sentAt`, the typed `code` and `wrong` (the red cells); a 6th digit or Sign in → `checking`; `wrong-code` → `sent` with the code cleared and `wrong`; `code-locked` → `locked`; `code-expired`, or `now − sentAt ≥ 10 min` (`codeExpired`, a `tick` from the Now store while on `sent`), → `expired`; any other failure → `sent` with the code kept. The `code` and `verify` actions carry `online`, so the reducer never enters `checking` offline. A right code answers `signed-in`, handled like a status answer. "Send a new code" and "Use a different email" work from `sent`, `checking`, `locked` and `expired`; a late check answer is then ignored. "Send a new code" and "Use a different email" show once `now − sentAt ≥ 10 s` (`differentEmailIn(sentAt, now)` → seconds left, read through `useNow("second")`); each send sets a new `sentAt`. Offline, `sent` never submits. `ui/CodeField` is one `<input>` under six presentational cells; `codeDigits(text)` keeps digits, max 6 (no `maxlength`, which would cut a pasted "482 913"). The input is `readOnly` while checking, so it keeps its focus for a wrong code, and `disabled` when locked. Fixtures: `signin=checking|wrong|locked`, `code=` prefills, the demo code `000000` is wrong, `backin={s}` sets `sentAt = now − (10 − s)`, `hold=1` freezes the clock. QR links still land on `/signin?link=opened|stale`.
- **Sheet chrome** (§8.9): `ui/Sheet` is a flex column: the white header and footer stay outside the body (`shadows.sheetHeader` / `sheetFooter`, the two 4% shadows), and only the body (`data-sheet-body`) scrolls, on `surfaceSoft`, so `useFieldInView` and the event sheet's picker reveal scroll the body. `uniform` gives the header and footer the card's own fill (note details). **Event page** (EVT-01): `ui/Page` replaces `Sheet` for New event, Edit event and Event details: a fixed full-screen `role="dialog"` above the nav (`zIndex` 20) with no scrim, which is itself the scroller (`data-sheet-body`, so `useFieldInView` and the picker reveal still work, the reveal leaving room for the sticky header `data-page-header`). The header (Back `arrow-left`, eyebrow, title, and the actions on the right) is sticky; with `compact` (phone) the actions move to a sticky bottom bar (`data-page-bar`). It slides in from the right on mount and out to the right when `leaving` is set (Web Animations, 280 ms, `easeOut` in and `cubic-bezier(.6,0,.8,.3)` out; none under reduced motion or without `animate`), then calls `onLeft`; `EventSheet` keeps `leaving` as the pending close (`leave(onClose | onDelete)`), so Back, Discard, Save and Delete all slide out first, and Details and Edit render the same `Page` instance (`detailsPage` is called, not mounted) so Edit does not slide again. Event sheets and Event details show `dayForecast(daily, day, now, tz)` (`domain/weather.ts`: the day's point from today through 6 days out, else none) after the eyebrow, read in `EventSheetScreen` only with a saved location. The All day row is a `ui/Switch` under Starts and Ends; while it is on, both `TimeField`s get `off` (disabled, struck through, named "{label}, off for all-day events") and show no length.
- **Settings controls** (SET-02..07): `ui/Radio` (a `radiogroup` of `role="radio"` buttons with `aria-checked`; only the checked one is in the tab order and the arrow keys choose and focus the next or previous one, wrapping; `direction` `row` for Clock and Temperature, `column` with 20 px icons for Season), `ui/Switch` (the whole labelled row is one `role="switch"` button with `aria-checked`: label, then the 56 × 32 track 16 px after it; the All day row uses it, and `labelStyle="eyebrow"` heads the Back to Today and Remove notes tiles), `ui/SettingsRow` with `checked` / `onCheckedChange` (the whole row is the switch, named by its title and described by its text, the track on the right: Hide sidebar when idle), `ui/Slider` (a styled `<input type="range">` with mono end labels, disabled when its switch is off). `features/settings/components/SwitchSliderTile` puts them together over `IDLE_MINUTES` (1–15) and `NOTE_DAYS` (1–30) from `domain/schemas`, which the settings schema also validates with. Each slider step writes `{ on: true, n }`; turning a switch off writes `{ on: false }` and keeps the number, so turning it on restores it.
- **Slideshow** index is derived from `{ from, since }` and `now` (8 s per slide), never a timer.
- **Featured photo** (PHOTO-15, PHOTO-16). Photos store no dimensions: `FeaturedPhoto` reads `naturalWidth`/`naturalHeight` on load and uses `object-fit: contain` when the photo is taller than wide (cover until then; an image already loaded before hydration is read on mount); other crops stay `cover`. The image grows from a `0px` flex basis (not `0%`) so a portrait's natural height never sizes the row. "Set as background" writes `changeBackground(settings.background, { mode: "photo", photoId })` through the settings repo and pins the slideshow on the photo (the slideshow reducer's `pin` action settles `openSlideshow(at, id)`, paused on it); the button state is derived from the saved background (mode `photo` and the same `photoId`). On wide and mid the thumbnail panel takes the featured block's height (grid row stretch) and its grid scrolls inside it.
- **Ambient transition** (AMB-10). `shell/ambientTransition.ts` holds the keyframes as pure `leaveHalf(from)` / `enterHalf(to)` (a root motion and/or a per-row motion; Ambient's rows are the wake button's children other than the `data-backdrop` layers). Every navigation to or from `/ambient` (idle, schedule, sidebar, Preview, wake tap) goes through `shell/useAmbientNavigate.ts`: `useAmbientNavigate()` runs the leave half on the current root with Web Animations (fill `forwards`, so it stays dimmed), then `router.push`es; the arriving root (the `AppShell` root, Ambient's wake button, the sign-in root) registers with `useAmbientRoot(ref, pathname)` and runs the enter half when it is the pushed path. The state is module-level, like `usePageTransition`, so it survives the layout change. While either half runs a `transitioning` flag adds window capture listeners that drop `pointerdown` and `click`, and further navigations are ignored; if no root claims the push within 1 s the flag clears. `pageMotion` returns no fade for these hops. Reduced motion or no `Element.animate` → push at once.
- **Uploads** run one XHR per file through `PhotosRepo.upload`; tiles live in memory, pause offline and resume or restart on reconnect.
- **Keyboard** (KB-*): `useKeyboardInset()` reads `visualViewport`; sheets and pages pad by it and `useFieldInView` scrolls the focused field into view. Return in a single-line input moves to the next field or submits.
- **Accessibility**: `PillTabs` is a `<fieldset>` of `aria-pressed` buttons; `Sheet` and the date picker are `role="dialog"` with focus trap and return (`ui/dialogFocus.ts`: `useFocusOnOpen`, `dialogKeyDown` for Escape and Tab wrap); `onAccent` is black except in Winter (4.5:1, checked by `theme/contrast.test.ts`); reduced motion zeroes `durBase` and `durSeason`.
- **Gallery** (`/dev/gallery`) shows every `ui` component in the four seasons and every state the boards show.

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
- **Auth offline.** `glance-meta` holds `{ accountId, name, email, signedOut? }`, written after sign-in. Offline, trust it; online, a 401 means signed out. Signing in to a different account first deletes the old account's DB and `photos` cache.
- **Photos offline.** After each pull, and at start for every saved photo, the worker sends `photosChanged(ids)`; the page forwards them to the SW, which fetches `thumb` and `display` into the `photos` cache one at a time.
- **Storage.** `navigator.storage.persist()` after sign-in. Manifest: `display: fullscreen`, `start_url /today`, `theme_color #000000`, `background_color #c8e6cd` (the icon's mint), the handoff's PWA icons (`pwa-icons/` copied to the `public/` root: 192 and 512, maskable 192 and 512); the root layout links favicons 16/32/48, apple-touch 180 and the `theme-color` meta. Home-screen install on iPad avoids Safari's 7-day cap.
- **Updates.** A new SW waits. At an idle move with an empty outbox, `IdleProvider` posts `SKIP_WAITING` and loads the target path on `controllerchange`; the SW is checked hourly. **Build check:** entity writes and `/api/sync` answer **426** when `X-Glance-Build` is missing or below `MIN_CLIENT_BUILD`. After a 426 the outbox can't drain, so the update applies at the next idle even with entries pending; they survive the reload and the new build pushes them. Without a waiting SW, an `outdated` screen does a full page load at idle instead. Any change that adds a field to a synced row raises `CLIENT_BUILD` (`domain/build.ts`) and `MIN_CLIENT_BUILD` (`server/http.ts`), because Valibot drops unknown keys and an older client would write the row back without it. New settings fields use `v.optional(…, default)`, so older rows parse.
- **Sign-out.** Stop the host (terminates the worker), call `auth.signout()` (answer ignored), clear `glance-meta`, delete the account DB and the `photos` cache.

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
- **Any other 4xx** (400, 403, 404, 409, 413, 415) → drop the entry, delete the local row if nothing else is pending, and pull from scratch to restore the server's copy.
- **426** → keep the outbox, stop syncing, update at the next idle (§4.5).
- **Network / 5xx / 429** → keep the entry and retry with backoff and on reconnect.

**Pull.** Every write bumps a global `sync_state.version` in the same transaction and copies it to the row. `GET /api/sync?since={cursor}` returns `{ cursor, changes: [{ entity, row }] }` for the account's tags, events, notes, photos and settings with `version > since`, tombstones included. The client applies them in one transaction, skipping rows with a pending outbox entry.

**Versions commit in order.** Each write transaction takes the `sync_state` row lock first (`stamp()` when it always writes, else `lockVersions()` then `stamp()`), so version *n* commits before *n + 1* is handed out. A no-op write bumps nothing. `pullChanges` runs in one `REPEATABLE READ` transaction. So a cursor never skips a version.

**Conflicts** (SYNC-03)
- **Delete wins.** A `PUT` on a tombstone returns the tombstone unchanged.
- **Settings are one row.** The last write replaces the whole JSON.

**Triggers.** `GET /api/sync/stream` (SSE) sends `data: {"version":n}` when the account changes, with a `: heartbeat` every 25 s and nothing on connect. The bus is an in-process EventEmitter keyed by account. The stream has no build check (`EventSource` can't send headers); the pull that follows does.

---

## 6. Server design

### 6.1 Route handlers
`runtime = 'nodejs'`. Steps: Origin check (writes only) → build check (426; the sign-in routes `code`, `code/verify`, `verify`, `status`, `name`, `guest` and `signout` skip it) → session (`requireDisplay`, 401) → Valibot parse (400) → service → map the `Result` to JSON. Errors are `{ error: code }` with 400/401/403/404/409/413/415/426/429/502. No middleware for auth. Helpers in `server/http.ts`; handlers import service indexes, never `server/db`. Body schemas live in `domain/schemas.ts`; query and header parsers (cursor, `q`, lat/lon, `v=`, upload headers) are in `server/http.ts`.

| Route | Notes |
|---|---|
| `PUT /api/tags/{id}`, `PUT/DELETE /api/{events,notes,photos}/{id}`, `PUT /api/settings/{accountId}` | Body is the domain schema (server fields stripped, body id = path id). Answers the stored `Synced<T>`. `DELETE` sets `deleted_at` and keeps the content. Another account's id → 404. Photos are only created by upload, so `PUT` doesn't insert and changes only title, date, place, sources and `checked` |
| `GET /api/sync`, `GET /api/sync/stream` | §5 |
| `POST /api/photos`, `GET /api/photos/{id}/file?v=` | §6.3 |
| `GET /api/weather` | The account's forecast; 409 `no-location`, 502 `weather-failed` |
| `GET /api/weather/places?q=` | `WeatherLocation[]` (empty = unknown place); 502 `weather-failed` |
| `GET /api/weather/locate?lat=&lon=` | Place with its zone; 404 outside the US, 502 `weather-failed` |
| `GET /api/displays` | The account's displays, this one first, then by `last_seen_at` |
| `/api/auth/*` | §6.2 |

Every accepted write is announced on the sync bus. A tag `PUT` with a name already used by a live tag of the account (ignoring case), or changing an existing tag, → 409. Event tag ids are filtered as D24. Settings (`AccountSettingsSchema`): `idleTimeout { on, minutes 1–15 }`, `noteExpiry { on, days 1–30 }`, `hideSidebarWhenIdle`; migration `010_settings_values.sql` rewrites each row (60/180/300 → on with 1/3/5 min, `null` → off with 3; `1d`/`1w` → on with 1/7 days, `null` → off with 7; adds `hideSidebarWhenIdle: true`) with one new version per account, and raises `CLIENT_BUILD` and `MIN_CLIENT_BUILD`. TPK-07 "same day" is a client rule; the server checks only `endAt > startAt` and a span under 24 h for timed events.

### 6.2 Auth (SIGNIN-*)
1. `POST /api/auth/code { email, timeZone }` → 204. Email trimmed and lowercased; the email's older code is replaced (only the newest works); same answer whether the account exists. Limits: 5 per email and 20 per IP per 10 min (in memory) → 429. Failed send (`mail-failed`) → 502.
2. `POST /api/auth/code/verify { email, code }` → `signed-in { account, returning, setupDone }` with a new display and session cookie, creating the account if new (`time_zone` from the code row) and deleting the row. Otherwise 400 `wrong-code` (tries counted), `code-locked` (the 5th wrong try, or any try after it) or `code-expired` (≥ 10 min, or no live code: an unknown email reads the same). 30 per IP per 10 min → 429. Codes compare in constant time.
3. `GET /api/auth/verify?t=` (QR links only, D23) → 303 to `/signin?link=opened` with a session for the opening device, or `/signin?link=stale` (unknown, used, voided or ≥ 5 min). `GET /api/auth/status`: a valid session → `signed-in { account, returning, setupDone }`, else `signed-out`.
4. `POST /api/auth/name { name }` saves the name (≤ 100 chars) and, when the account has no tag yet, creates the first tag with that name and the first color in the same transaction. `POST /api/auth/location` saves the SIGNIN-14 place or a skip and sets `accounts.setup_done_at`.
5. `POST /api/auth/signout` deletes this display's session and display row.
6. `POST /api/auth/qr` makes a one-time QR link for this display (voiding its older one; 30/hour); `DELETE /api/auth/qr { url }` voids it. A stale QR never reveals the account email.
7. **Guest** (SIGNIN-16, §6.5 `GUEST_EMAIL`): `GET /api/auth/guest` → 204 when guest sign-in is on, else 404; the form reads it once and shows the button on 204 (the `demo=1` fixture forces it in demo builds). `POST /api/auth/guest` (Origin checked, 20 per IP per 10 min → 429) opens a display and session for that account exactly as `code/verify` does and answers `signed-in { account, returning: true, setupDone: true }`; 404 when off (the IP limit is checked first). It never takes an email from the client.

`requireDisplay` resolves the session cookie to `{ displayId, accountId }` and stamps `last_seen_at`. Displays store `kind` and `browser` from the `User-Agent`.

**Mailer** (`server/mail/`). Auth takes a `Mailer` in its deps and never sees a provider.

```ts
type MailMessage = { to: string; subject: string; text: string; html?: string };
type Mailer = { send(message: MailMessage): Promise<Result<void, "mail-failed">> };
```

- **Sign-in email**: `signInMessage(to, code, season)` (`mailer.ts`) → `{ to, subject, text, html }`, with the HTML in `signInHtml.ts`: `emails/sign-in-code.html` as a template string (tables, inline styles, Arial and Courier New), every word from `copy.signIn.email`, the email HTML-escaped. `season` is the account's fixed season, else `seasonOf(now)` in the request's time zone; it picks the hero and page colors (Spring `#dceeb1`/`#f4ecd6`, Summer `#f6e3a1`/`#f4ecd6`, Fall `#f0c987`/`#f4ecd6`, Winter `#d5e4f1`/`#e9edf3`).
- **Contract** (`mailer.ts`): the sender is bound from `MAIL_FROM` when the mailer is built, so messages carry no `from`. Any failure (a non-2xx answer, a network or SMTP error) is `mail-failed`, never a throw. One attempt, no retry. A failure is logged once (`mailFailed`) with the provider and the status or error, never the message or the provider's answer (they hold the sign-in code). `parseAddress` splits `MAIL_FROM` into `{ email, name? }` and is the env check for it.
- **Adapters**: `createResendMailer(config, from, fetch)` (`resend.ts`) → `POST https://api.resend.com/emails`, Bearer key, JSON `{ from, to, subject, text, html }`. `createMailtrapMailer` (`mailtrap.ts`) → `POST https://send.api.mailtrap.io/api/send`, or `https://sandbox.api.mailtrap.io/api/send/{inboxId}` when an inbox is set, Bearer token, JSON with `from: { email, name }` and `to: [{ email }]` (`parseAddress` splits `MAIL_FROM`). `createMailgunMailer` (`mailgun.ts`) → `POST https://api.mailgun.net/v3/{domain}/messages` (`api.eu.mailgun.net` for `eu`), Basic `api:{key}`, form-encoded fields. The three share one `postMail` step (`http.ts`). `createSmtpMailer(transport, from)` (`smtp.ts`) calls `transport.sendMail({ from, ...message })` on a minimal `SmtpTransport` type, so tests pass a fake; the factory passes `nodemailer.createTransport({ host, port, secure, auth })`.
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

- **Contract** (`store.ts`): keys are `{file_path}.{variant}`; the original's content type is the one `sharp` decoded. `remove` of a missing key succeeds, and `remove` settles every key before it throws (both adapters use `allSettled`). Only `not-found` is a `Result`; disk and network failures throw (500).
- **Adapters**: `createDiskStore(root)` (`disk.ts`) writes under `{DATA_DIR}/photos` and sniffs the original's type on read. `createS3Store(config, fetch)` (`s3.ts`) signs single-request `PUT`, `GET` and `DELETE` calls with **`aws4fetch`** (SigV4) for AWS S3 and any S3-compatible endpoint; an S3 404 maps to `not-found`. AWS buckets are addressed virtual-hosted (`https://{bucket}.s3.{region}.amazonaws.com/{key}`); a custom `endpoint` (S3-compatible hosts, R2) is addressed by path (`{endpoint}/{bucket}/{key}`).
- **Factory** (`index.ts`): `createPhotoStore(config, fetch = globalThis.fetch)` switches on `config.kind`: `disk` → disk store at `{dataDir}/photos`, `s3` → S3 store, `r2` → S3 store with `endpoint = https://{accountId}.r2.cloudflarestorage.com` and `region = auto`. `photoStore()` builds it once from `env().storage` and is shared by services and jobs.
- **Tests**: one contract suite (`contract.ts`: put then get, missing key → `not-found`, idempotent `remove`) runs against the disk store on a temp dir and the S3 store on a fake `fetch` (`fakeS3.ts`, an in-memory bucket); the R2 config is checked to reach the R2 endpoint.

### 6.4 Jobs
`bootServer()` (from `instrumentation.ts`) migrates, exits on failure, then `startJobs()`: an hourly `unref` timer plus a tick at boot; daily jobs run on the first tick of each UTC day. A failing job is logged and doesn't stop the others: `createJobTick({ hourly, daily: [signIns, photos] })` guards each one. Jobs run across accounts.
- **Note expiry** (hourly): tombstones notes older than the account's `noteExpiry.days` while it is on, using the screens' `noteExpired` rule, then publishes each account's version on the bus.
- **Code and link cleanup** (daily, `cleanupSignIns`): deletes `sign_in_codes` and `magic_links` expired more than 24 h ago.
- **Deleted photo files** (daily): removes the stored objects of tombstoned photos; one photo's failure doesn't stop the rest, and the job then throws so it is logged.

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

**Guest sign-in** (SIGNIN-16): optional `GUEST_EMAIL` names an existing account whose setup is done (the demo site's shared family, created once through a normal sign-in). When it is unset or that account doesn't exist, the guest routes answer 404 and the button stays hidden.

**Demo build** (`NEXT_PUBLIC_DEMO=1`, implied by `next dev`): fixture URL params, `/dev/gallery` and the sign-in dev buttons are compiled in; the display uses `glance-fixture` + `FixtureTransport` and skips the `glance-meta` gate. Demo-only routes are `page.demo.tsx`, added to `pageExtensions` only for dev or demo builds.

---

## 7. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/domain`; server services, auth and jobs on a fresh migrated PGlite DB per test, each with a cross-account test; recorded Census answers |
| Component | Vitest + Testing Library | `ui` and feature components: clicks, validation, ARIA |
| Data / sync | Vitest + `fake-indexeddb`, stubbed `fetch` / `EventSource` | Repos (row + outbox in one transaction), `engine.ts` (push order, backoff, 401 keeps the outbox, pending rows skipped, tombstones, weather retries), worker lock and restart |
| Time zone | Vitest with `TZ=Asia/Kolkata` | `zone.ts` across DST in several zones; every rule that reads a day or hour runs in a zone other than the device's |

Checks: `biome check` → `tsc --noEmit` → Vitest → `next build`. GitHub CI (`.github/workflows/ci.yml`) runs them on demand only for now; `/glance-next` runs them locally before each merge to `main`.

**Manual checks** on a production build, before each release and every Next upgrade: visual parity with the boards at the 6 sizes; offline cold start with every view and synced photo (OFF-06); two screens syncing, offline replay, delete wins, polling fallback (SYNC-01..03); a 401 with a change waiting, then signing in with the same and another email (SIGNIN-13, SIGNIN-11); a new build applied on an idle screen (OFF-07).
