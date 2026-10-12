# Glance — Product Specification

| | |
|---|---|
| Status | Draft v0.10 — DS primitives from F07: Card `elevated` variant and tappable cards, IconButton `lg` (§4.2) · v0.9 — domain rule details from F06: STATUS-01 events with no end, NOTE-04 stamp aging, TODAY-07 rotation order · v0.8 — design review fixes (OFF-07, SYNC-03, PHOTO-03, §7, §7.0, §9.3, §11), no photo upload on phone (§1.2, §5.4), domain types aligned with the store (§7), AMB-03 rule, SIGNIN-11 discard · v0.7: no automated visual snapshots (§11) · v0.6: offline cold start (§3, SIGNIN-13, NOTE-08, OFF-06/07) · synced with design handoff **v3** (sign-up/sign-in flow, photo upload, weather location search, "Glance" screen label). Decisions from 2026-10-11 applied, including the technical design |
| Technical design | [`docs/tech-design.md`](tech-design.md) — stack, architecture, project structure, sync protocol (D1–D19) |
| Date | 2026-10-11 |
| Design requests | [`docs/design-prompts.md`](design-prompts.md) — prompts for Claude Design to cover the undesigned parts |
| Source of truth | [`docs/design/handoff/Glance.dc.html`](design/handoff/Glance.dc.html) (prototype) · [`Glance - Behavior Notes.dc.html`](design/handoff/Glance%20-%20Behavior%20Notes.dc.html) · [`Glance Frames.dc.html`](design/handoff/Glance%20Frames.dc.html) |
| Approach | Design-driven, UI first: build every screen and state against fixtures, then connect real data |

Requirement IDs (`TODAY-03`, `NOTE-05` …) are meant to be cited in tickets, PRs and tests. **[Mock]** marks behavior the prototype fakes that needs a real implementation. **[Open]** marks a decision that has not been made yet (see §12.2).

---

## 1. Product overview

**Glance** is a responsive web app that works as a **family wall calendar**: a shared calendar, weather, notice board and photo frame for one household. It runs on wall-mounted or stand-mounted touch screens (1920×1080 and 1280×800), laptops, tablets (iPad portrait 820) and phones (390).

- **Primary user: any family member at the display**, kids included. Reads the screen from across the room, taps to see details, adds a note or event. Doesn't sign in at the display.
- **Secondary user: the account holder (usually a parent).** Owns the family's single account (one email). Signs screens in, manages settings, uploads photos.
- **Voice:** "a calm family noticeboard." Warm but brief, sentence case, readable from 2 m, words a child can read. Never "I". "You" only in instructions.

> **Decided (2026-10-11): the audience is family members.** Handoff v2 re-copied the prototype, boards and mock data for families (the copy changelog is at the top of the behavior notes). Layouts, components and behavior are unchanged from v1. §10 lists the changes.

### 1.1 Goals
1. Anyone in the room can see "what's happening now / next", today's weather and family notes at a glance.
2. Anyone at the display can add or edit events and notes without signing in.
3. The display stays readable and useful when offline, when a data source fails, and during quiet hours (Ambient).

### 1.2 Non-goals for v1 (not designed)
Calendar sync (Google/Outlook) · recurring, all-day and multi-day events · note moderation, character limit, board overflow · photo delete, rename, albums · photo upload on phones (future: hidden in v1, §5.4) · weather alert rules, forecast-day detail · changing the weather location from Settings · guided setup, multi-display management, roles (e.g. parent vs. child permissions) · per-person colors or filters · session expiry, kiosk lock · burn-in protection.

---

## 2. Precedence of sources

**Primary source of truth: [`docs/design/handoff/Glance.dc.html`](design/handoff/Glance.dc.html)**, the working prototype (markup and logic). Layout, copy, states and component usage are taken from it first.

Secondary references fill in what the prototype can't show. If one conflicts with the prototype, the prototype wins. If secondary references conflict with each other, the earlier one wins:

2. [`Glance - Behavior Notes.dc.html`](design/handoff/Glance%20-%20Behavior%20Notes.dc.html): interactions, timers and states the screens can't show
3. [`docs/design/handoff/README.md`](design/handoff/README.md): handoff overview and data needs
4. Design system `docs/design/handoff/_ds/…/readme.md`: tokens and component foundations

Known conflicts where the handoff overrides the design system:

| Topic | Design system says | Glance does |
|---|---|---|
| Navigation | TopBar at the top (88 px) plus a bottom Ticker | Nav bar at the **bottom**, 72 px tall, icon buttons only, **no Ticker** |
| Backgrounds | Solid flat color only, no photos | Photo, Slideshow and dim modes. Text zones sit on white panels |
| Brand | "Kiosk" | "Glance" (plain Geist 540, no logo) |
| Audience and copy | Lobbies, offices, schools | Family home (handoff v2 copy, §10) |
| Tokens | CSS custom properties | StyleX `defineVars` / `createTheme` (§4.1). Values unchanged |
| Type sizes | Fixed px (clock 168, display-xl 86…) | Fluid `clamp()` overrides on the app root (§4.3) |
| 12-hour times | Always mono AM/PM | Event rows **omit** AM/PM. Hero, forecast, sunset and ambient include it |

---

## 3. Technical baseline (decided 2026-10-11)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (App Router), run as a **single-page app** | One root layout keeps the shell (nav bar, season, clock, offline pill) mounted. Each view is a client-rendered route segment (`'use client'`) reached through soft navigation (`<Link>` / `router.push`). Server components render only the HTML shell. No per-view server data fetching |
| Language | **TypeScript**, `strict: true` | Domain types in §7 are the shared contract between client and API |
| Lint/format | **Biome** | Replaces ESLint and Prettier. `biome check` runs in CI and pre-commit |
| Styling | **StyleX** via `@stylexjs/babel-plugin` + `@stylexjs/postcss-plugin` | The official Next.js setup (works with Webpack and Turbopack from Next 16.0.3): `babel.config.js` with `next/babel` + the StyleX plugin, `postcss.config.js` sharing that config, and `app/globals.css` containing `@stylex;`. No CSS modules and no Tailwind |
| Database | **SQLite** | Accessed only from Next.js Route Handlers (`app/api/**/route.ts`), never from the client. Driver: `better-sqlite3` (synchronous, mature, and already in Next's default `serverExternalPackages`). Run in WAL mode |
| API | Route Handlers, JSON | `/api/events`, `/api/notes`, `/api/photos`, `/api/settings`, `/api/weather` (server proxy to the provider), `/api/auth/*`, `/api/sync` (pull) + `/api/sync/stream` (SSE change ping) |
| Client data | **Local-first store** on IndexedDB (Dexie) | Screens read local data only. Writes go to IndexedDB plus an outbox, and a sync engine pushes and pulls ([tech design](tech-design.md) D4, §5) |
| Validation | **Valibot** | Schemas in `src/domain` are the runtime contract for the §7 types, on the client and in Route Handlers |

**Consequences of these choices:**
- **No `output: 'export'`.** SQLite needs a running Node server, so the app ships as `next build && next start` (or a standalone output in a container) on a host with a **persistent disk**. Serverless hosts with ephemeral filesystems (e.g. Vercel functions) are ruled out unless SQLite moves to a hosted variant (Turso/libSQL). Hosting (decided): one Docker container (`output: 'standalone'`) on a VPS or home server, volume at `/data`.
- **"SPA" here means:** after the first load, view changes never trigger a full page load, and the shell's timers (clock, idle, slideshow, sync) keep running across views. Deep links like `/calendar` still work because each view is a real route.
- **Data flow:** screens read and write through client repositories (§11) backed by IndexedDB. A sync engine pushes queued writes to the API and pulls changes (§9.7). The server is the source of truth.
- **Migrations:** plain versioned SQL files applied at startup (`db/migrations/NNN_*.sql`, tracked with `PRAGMA user_version`). No ORM (decided): raw SQL with small typed helpers.
- **Icons:** Lucide **0.460.0** (`lucide-react` pinned to the same version). Stroke 1.75, or 1.25–1.5 at sizes ≥ 48.
- **Fonts:** Geist and Geist Mono, variable 100–900 (fine weights 320/330/340/480/540 are required). Self-host for offline use rather than loading from Google Fonts at runtime.
- **Offline:** service worker plus local persistence (IndexedDB) are required by §9. The app is an **installable PWA** that cold-starts offline (OFF-06). Serving it needs HTTPS. On iPad kiosks, install it to the home screen so the browser doesn't evict saved data. See [tech design](tech-design.md) D16, §4.5.
- `support.js` and `archive/` in the handoff are **not** part of the build.

---

## 4. Design system port (Phase 0)

### 4.1 Tokens
Port the values verbatim from `docs/design/handoff/_ds/…/tokens/` into StyleX:

- `src/theme/tokens.stylex.ts` uses `stylex.defineVars` for `colors`, `space`, `radii`, `shadows`, `motion` and `type`. Files that define vars must use the `.stylex.ts` suffix and export the vars by name.
- **Seasons** are a `defineVars` group (`season.block1..4`, `soft`, `deep`, `onDeep`, `accent`, `onAccent`) with Spring as the default. `summer`, `fall` and `winter` are `stylex.createTheme(season, {...})`. The root element applies the active theme. A change cross-fades via `transition` on background colors (600 ms).
- **Fluid type (§4.3)** goes into the `type` vars as `clamp()` values. Ambient overrides them with a `createTheme` scoped to the Ambient root.
- **Runtime values** (photo URL, dim amount, per-event tone colors) are passed through StyleX dynamic styles (`stylex.create({ bg: (url) => ({ backgroundImage: url }) })`), never inline `style` strings.
- `@keyframes` (skeleton pulse) uses `stylex.keyframes`.
- Fonts are self-hosted with `next/font/local` (Geist and Geist Mono variable). The font CSS variable is fed into the `type.fontSans` / `type.fontMono` vars.

Token source files:

| File | Contents |
|---|---|
| `colors.css` | Monochrome core, pastel block family, seasonal extensions, semantic (`--success`, `--danger`, `--scrim` 60%, `--on-inverse-soft` 16%) |
| `seasons.css` | `[data-season=spring\|summer\|fall\|winter]` → `--season-block-1..4`, `--season-soft`, `--season-deep`, `--season-accent` plus surface aliases |
| `typography.css` | Type roles plus `.t-*` helpers |
| `spacing.css` | Space scale, radii, shadows 0–3, touch sizes, motion durations and easings |
| `base.css`, `fonts.css` | Reset, font import |

Season → block roles: **block-1 = hero/now, block-2 = notes, block-3 = weather, block-4 = highlight**, soft = warm neutral, deep = ambient background, accent = alerts (at most one accent CTA per screen).

| Season | 1 | 2 | 3 | 4 | soft | deep | accent | Icon |
|---|---|---|---|---|---|---|---|---|
| Spring | Lime | Pink | Mint | Lilac | Cream | Navy | Magenta | `flower-2` |
| Summer | Sun | Coral | Sky | Lime | Cream | Sea | Tangerine | `sun` |
| Fall | Amber | Rust | Sage | Coral | Cream | Bark | Ember | `leaf` |
| Winter | Ice | Lilac | Glacier | Mint | Frost | Midnight | Cobalt | `snowflake` |

### 4.2 Components
Rebuild these as typed React components with the props below (taken from `_ds_bundle.js`):

| Component | Props | Notes |
|---|---|---|
| `Clock` | `time, hour12=true, showDate=true, size='xl', align` | Tabular numerals. Must accept a live `Date` |
| `EventRow` | `start, end, title, location, status: 'past'\|'now'\|'upcoming', dot, onClick` | Past = struck through, grey dot. Now = season fill and NOW pill |
| `MonthGrid` | `year, month, selected, today, marked[], onSelect, showTitle, cell` | Selected = black. Today = ring. Marked = dot |
| `Button` | `variant: primary\|secondary\|ghost\|accent\|inverse, size: md\|lg, icon, iconRight, fullWidth, disabled` | Always a pill (radius 50) |
| `IconButton` | `icon, variant: soft\|canvas\|solid\|inverse, size: md\|touch\|lg, label, active` | `md` = 40, `touch` = 56, `lg` = 72 px. `active` = black |
| `PillTabs` | `options[], value, onChange, size` | Segmented control used for every Settings choice |
| `TextInput` | `label, value, onChange, placeholder, multiline, rows, error` | 2 px black focus ring. Error text below |
| `TopBar` | `brand, center, right, height, inverse` | Used as the bottom nav bar, `brand=""`, height 72 |
| `ColorBlock` | `tone: 1-4\|soft, padding, radius` | Never shadowed |
| `Card` | `variant: hairline\|soft\|canvas\|elevated, title, eyebrow, onClick` | With `onClick` the card is a button |
| `Banner` | `icon, title, body, actionLabel, onAction, tone` | |
| `WeatherNow` | `location, temp, unit, condition, icon, high, low, feelsLike, details[], tone=3` | |
| `ForecastDay` | `day, icon, high, low, precip?, active` | |
| `StickyNote` | `children, author, time, tone, rotate, width, minHeight, onClick` | Radius 6, shadow-2 |
| `Eyebrow`, `Icon` | — | Mono uppercase label. Lucide wrapper |
| `Ticker` | — | **Not used** in Glance |

New components designed in handoff v2 (not in the DS bundle): **`TimeField`**, **`TimePicker`** (§8.3.1). Other shared pieces the screens need (not in the DS): `Skeleton` (pulse 1.2 s, opacity 0.06–0.1), `EmptyState` (icon · title · body · one action), `SourceFailure` (icon · "{Source} unavailable" · retry countdown · Try again), `Sheet` (modal over a 60% scrim, radius 32, max-width 560), `ColorSwatchPicker`, `OfflinePill`, `SettingsRow`.

Components live in `src/ui/` and are styled only with StyleX. Each accepts an optional `xstyle` prop (a StyleX style) for layout overrides from the caller, in place of the prototype's `style` prop.

**Acceptance (DS-01):** a dev-only gallery route (`/dev/gallery`, excluded from production builds) renders every component in all 4 seasons, side by side with the DS cards.

### 4.3 Fluid type and gutters
Values for the `type` vars (exact values from the prototype, shown here as CSS for reference):

```css
--type-clock-size: clamp(84px, 7.4vw, 112px);   --type-clock-ls: -4px;
--type-temp-size:  clamp(76px, 6.4vw, 96px);    --type-temp-ls:  -3px;
--type-display-xl-size: clamp(36px, 3.6vw, 52px); --type-display-xl-ls: -1px;
--type-display-lg-size: clamp(28px, 2.6vw, 40px);
--type-headline-size: 20px; --type-headline-ls: -0.2px;
--type-body-lg-size: 18px; --type-body-size: 16px; --type-body-sm-size: 15px;
--type-button-size: 17px; --type-eyebrow-size: 14px;
--kiosk-gutter: clamp(20px, 2.6vw, 40px);
```
Ambient overrides: `--type-clock-size: clamp(84px, 19vw, 300px); --type-clock-ls: -8px; --type-eyebrow-size: clamp(14px, 1.4vw, 20px)`.

### 4.4 Motion and feedback
- Touch-first: **no hover states.** Press scales to 0.97 over 120 ms ease-out. Fills never darken.
- Tab/tile state 180 ms · screen change 280 ms fade · season and background cross-fade 600 ms ease-in-out · keyboard resize 280 ms.
- No bounces, no backdrop blur.

---

## 5. App shell and layout

### 5.1 Breakpoints (by window width, re-evaluated live on resize)

| Name | Width | Behavior | Devices |
|---|---|---|---|
| `wide` | ≥ 1200 | Fits one screen, no page scroll | 1920×1080, 1440×900, 1280×800 |
| `mid` | 1000–1199 | Fits one screen | 1180×820 |
| `narrow` | 600–999 | One scrolling column (stacked) | iPad portrait 820×1180 |
| `phone` | < 600 | One column everywhere, phone tweaks (§5.4) | 390×844 |

### 5.2 Shell
- Root: `height: 100vh`, flex column, `data-season` attribute, background = season canvas or photo layer (§8.7).
- `<main>` scrolls. Padding = gutter on top and sides, 24 px at the bottom.
- **Nav bar (SHELL-01):** bottom, sticky, 72 px, hairline top edge. Six IconButtons, `size="touch"` (56 px): **Today** `house`, **Calendar** `calendar-days`, **Weather** `cloud-sun`, **Notes** `sticky-note`, **Photos** `image`, then **Settings** `settings` aligned right. Labels via `aria-label`/`title`.
- **SHELL-02:** active view = black button. Settings stays active on Background.
- **SHELL-03:** the bar is hidden on Sign in and Ambient.
- **SHELL-04:** changing view closes any open sheet and resets `main` scroll to the top.
- **SHELL-05:** with a photo background, every zone with text sits on a white panel (radius 24). Color blocks and the bar stay solid.

### 5.3 Grid templates per view (`layout(view, bp)`)

| View | wide | mid | narrow |
|---|---|---|---|
| Today | `minmax(300px,.95fr) minmax(0,1.35fr) minmax(320px,1fr)`; areas `"hero sched wx" "hero sched notes"`; rows `auto minmax(0,1fr)`; fills height | `1fr 1.3fr`; `"hero sched" "wx notes"` | `1fr 1fr`; `"hero wx" "sched sched" "notes notes"` |
| Calendar | `auto 1fr`, cell 60 | `auto 1fr`, cell 54 | 1 col, cell 84 |
| Weather | `minmax(380px,.85fr) 1.4fr` | `minmax(340px,.8fr) 1.2fr` | 1 col |
| Photos | `1.6fr minmax(300px,1fr)`, photo min-h 320, thumbs 2 col | same | 1 col, photo 440, thumbs 3 col |
| Settings | `1.4fr minmax(320px,1fr)` | same | 1 col |
| Background | `1.4fr minmax(320px,1fr)`, thumbs 4 col | thumbs 3 col | 1 col, thumbs 3 col |
| Sign in | `1fr 1fr` | same | 1 col |

### 5.4 Phone (< 600) overrides
- Starts from the `narrow` layout, then: Today areas `"hero" "wx" "sched" "notes"` (single column).
- Hourly forecast `repeat(8, 64px)` and 7-day `repeat(7, 64px)` scroll sideways.
- Month cell = `max(36, floor((vw − 108) / 7))`.
- Photos: featured 260 px, thumbs 2 col. Background thumbs 2 col.
- **No photo upload on phone (decided, future feature).** Hide every upload entry point: Photos "Upload" (PHOTO-03) and "Upload photos" (PHOTO-05), Background "Upload photo" tile (BG-02) and Today's "Upload" link (TODAY-07). Copy stays the same. This deviates from the 390×844 frames that show them.
- Nav buttons 44 px with a 4 px gap so all six fit.
- EventRow columns `56px 10px 1fr auto`, gap 12, padding `12px 8px` (other sizes: `84px 14px 1fr auto`, padding `14px 16px`).
- Offline pill sits 84 px from the bottom (12 px elsewhere).

---

## 6. Routing and URL state

Each view is an App Router segment under one `(app)` route group whose `layout.tsx` holds the persistent shell. `/signin` and `/ambient` sit outside that group, so they render without the bar. Navigation between views is client-side only (SPA). The prototype's query parameters stay supported in **dev/fixture builds** so every frame can be opened directly (used for visual QA, §11).

| Route | View |
|---|---|
| `/signin` | Sign in |
| `/` → `/today` | Today |
| `/calendar` | Calendar (optional `?date=YYYY-MM-DD`) |
| `/weather` | Weather |
| `/notes` | Notes |
| `/photos` | Photos |
| `/settings`, `/settings/background` | Settings, Background |
| `/ambient` | Ambient |

Fixture params: `bg=photo`, `sheet=event|newevent|note|newnote`, `time=start|end|error|noend`, `clock=24`, `season=spring|summer|fall|winter`, `empty=1`, `net=loading|offline|wxerror`, `kb=1`, `signin=form|sending|sent|name|phone|expired|offline|done` (+ `on=link` with `expired` = the device that opened the link, `acct=returning` with `done` = "Welcome back"), `upload=one|progress|error|offline` (with `/photos` or `/settings/background`), `wx=searching|unknown|choose`, plus `now=ISO` to freeze the clock (replaces the hardcoded Fri Oct 9 2026 10:41). URL states are frozen snapshots; timers only run after a tap.

---

## 7. Domain model

```ts
type Tone = 1 | 2 | 3 | 4 | 'soft' | 'accent';      // 'accent' = Alert, events only
type Season = 'spring' | 'summer' | 'fall' | 'winter';

// Synced rows (events, notes, photos, settings) also carry server fields:
type Synced<T> = T & { updatedAt: string; version: number; deletedAt?: string };  // stamped by the server

interface CalendarEvent {
  id: string;
  startAt: string;  // ISO timestamp, UTC (the prototype stores minutes of the day) [Mock]
  endAt?: string;   // ISO, optional ("No end time"); must be after startAt on the same local day (TPK-07, checked on the screen)
  title: string;  // required
  location?: string;
  tone: Tone;     // default 1
}

interface Note {
  id: string;
  text: string;          // required, multiline [Open: character limit]
  author: string;        // blank → "Guest"
  createdAt: string;     // ISO
  tone: Exclude<Tone, 'accent'>;
  rotation: number;      // degrees, cycles −2, 1.5, −1, 2.5
}
// "Waiting to post" (pending) is derived from the local outbox, never stored (tech design §4.1).

interface Photo { id: string; title: string; takenOn: string; place?: string; createdAt: string; }
// The image URL is derived: /api/photos/{id}/file?v=display|thumb|orig

interface Weather {
  location: string;
  fetchedAt: string;
  current: { temp: number; condition: string; icon: LucideWeatherIcon; high: number; low: number;
             feelsLike: number; windMph: number; windDir: string; humidity: number; uv: number; sunset: string };
  hourly: Array<{ time: string; icon: LucideWeatherIcon; temp: number }>;           // 8 points
  daily:  Array<{ date: string; icon: LucideWeatherIcon; high: number; low: number; precip?: number }>; // 7 days
}
// Temperatures are stored in °F and converted for display: C = round((F − 32) × 5/9). No unit letter is shown.

interface AccountSettings {           // persisted PER ACCOUNT (decided): every display signed in to the family account shares them
  season: 'auto' | Season;            // Auto: Mar–May Spring, Jun–Aug Summer, Sep–Nov Fall, Dec–Feb Winter
  clock: '12h' | '24h';
  tempUnit: 'F' | 'C';
  background: { mode: 'season' | 'photo' | 'slideshow'; photoId?: string;
                dim: 0 | 0.2 | 0.4; rotate: 'hourly' | 'daily' | 'weekly' };
  idleTimeout: 60 | 180 | 300 | null; // default 3 min
  noteExpiry: '1d' | '1w' | null;     // default 1 week
  ambientHours: { start: '18:00'; end: '07:30' };   // not editable in v1
  weatherLocation?: { name: string; region: string; lat: number; lon: number };  // the place picked in WX-04/09
}

interface Account { id: string; email: string; name: string | null; /* person's name, "Maria"; null until first sign-in completes */ }
interface Display { id: string; accountId: string; }  // one signed-in screen, no name; the screen label is always "Glance"
```

**Account model (decided 2026-10-11):** one family = **one account = one email**. There are **no members** and no per-person logins. Sign-up and sign-in are the same magic-link flow (SIGNIN-12).

**Scope rule:** events, notes, photos and settings belong to the **account**. A display is a signed-in session on one screen. It holds no settings of its own, so changing a setting on one display changes it on every display of that family (synced via §9.7).

### 7.0 SQLite schema (v1)

```sql
CREATE TABLE accounts  (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                        name TEXT, time_zone TEXT NOT NULL,                -- IANA zone sent by the waiting screen with the link request
                        created_at TEXT NOT NULL);                         -- name NULL until the first-sign-in step
CREATE TABLE displays  (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
                        last_seen_at TEXT);
CREATE TABLE sessions  (token_hash TEXT PRIMARY KEY, display_id TEXT NOT NULL REFERENCES displays(id),
                        created_at TEXT NOT NULL);                       -- account comes from the display
CREATE TABLE magic_links (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL,
                        pending_id TEXT NOT NULL, time_zone TEXT NOT NULL, -- waiting screen's cookie id; its display row is created on verify
                        expires_at TEXT NOT NULL, used_at TEXT);           -- 10-minute expiry, single use; a new link voids older ones for that email (SIGNIN-12)
CREATE TABLE events    (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
                        title TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT, location TEXT,
                        tone TEXT NOT NULL DEFAULT '1', updated_at TEXT NOT NULL, deleted_at TEXT,
                        version INTEGER NOT NULL,
                        CHECK (end_at IS NULL OR end_at > start_at));  -- same local day is checked on the screen (TPK-07); the API also rejects spans ≥ 24 h
CREATE TABLE notes     (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
                        text TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'Guest', tone TEXT NOT NULL,
                        rotation REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
                        version INTEGER NOT NULL);
CREATE TABLE photos    (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
                        title TEXT NOT NULL, taken_on TEXT, place TEXT, file_path TEXT NOT NULL,
                        created_at TEXT NOT NULL, version INTEGER NOT NULL);
CREATE TABLE settings  (account_id TEXT PRIMARY KEY REFERENCES accounts(id),
                        json TEXT NOT NULL, updated_at TEXT NOT NULL,
                        version INTEGER NOT NULL);                         -- AccountSettings as JSON
CREATE TABLE weather_cache (account_id TEXT PRIMARY KEY, location TEXT NOT NULL,  -- "lat,lon" the cache was fetched for
                        json TEXT NOT NULL, fetched_at TEXT NOT NULL);
CREATE TABLE sync_state (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL);  -- global change counter
CREATE INDEX events_account_start ON events(account_id, start_at);
CREATE INDEX notes_account_created ON notes(account_id, created_at);
```

- IDs are UUIDv7 generated on the client, so items created offline keep their ID after sync.
- Timestamps are ISO-8601 UTC strings. Display uses the browser's local time zone. Server jobs use `accounts.time_zone` (decided).
- `updated_at` and `version` are always stamped by the server. Every write bumps `sync_state.version` in the same transaction and copies it to the row. `/api/sync?since=` returns rows with a higher `version` (§9.7).
- Soft deletes (`deleted_at`) let other displays receive deletions through `/api/sync`.
- Photo files are stored on disk (`/data/photos/{account}/{id}.{orig|display|thumb}`) and served through an authenticated route. On upload, `sharp` makes a display copy (≤ 2560 px) and a thumb (≤ 640 px) in WebP. Only metadata goes in SQLite.
- Note expiry (NOTE-08) runs server-side on an hourly timer: soft-delete notes older than `noteExpiry`, in the account's time zone.

Defaults: season Auto, 12-hour, Fahrenheit, background Season color (dim Light, rotate Daily), idle 3 min, notes 1 week.

### 7.1 Derived event status (STATUS-01)
For each event on today: `past` if `end ≤ now`, `now` if `start ≤ now < end`, otherwise `upcoming`. An event with no end (TPK-08) is `now` from its start to the end of its day. Recompute every minute. Events on other days: past days → `past` (struck through, decided), future days → `upcoming`. The prototype rendered every non-today event as upcoming.

### 7.2 Time formatting (TIME-01)
| Context | 12-hour | 24-hour |
|---|---|---|
| Clock, hero "until"/start, sunset, ambient, sync time | `10:41 AM` (mono AM/PM) | `10:41` |
| Event rows, ranges | `10:30 – 11:15` (no AM/PM) | `10:30 – 11:15` |
| Hourly forecast | `4 PM` | `16:00` |

---

## 8. Screens

Each screen lists **Behavior**, **States** and **Acceptance**. All copy is exact. Copy in `{braces}` is interpolated.

### 8.1 Sign in & account — `SIGNIN` (designed in handoff v3)
Layout: left = season block-1 hero ("Glance" wordmark, season eyebrow "{Season} · {Month}", live Clock, "Calendar, weather, notes and photos for your family. Sign in to manage them."). Right = form, max-width 560. The lock footer "Only your family can see its calendar, notes and photos." stays in every form state.

One flow for sign-up and sign-in (account model §7). The screen that asks for the link becomes the **waiting screen**. The link can be opened on that screen or on another device, usually a phone.

| ID | Requirement |
|---|---|
| SIGNIN-01 | **Email form**, the same for new and returning families: eyebrow "One account per family", title "Sign in or get started", body "Enter your email. We'll send a link that signs this screen in. New here? The same link sets up your family's Glance." Email field (placeholder `name@example.com`), primary "Send sign-in link" (→ icon), ghost "Continue as demo". |
| SIGNIN-02 | Validation `name@domain.tld`. Invalid → "Enter a valid email address", cleared on the next keystroke. |
| SIGNIN-03 | **Sending:** after a valid "Send sign-in link", the button reads "Sending…" and is disabled, the email can't be edited, a soft tile reads "Sending a link to {email}" with a slow-pulsing mail icon, and "Continue as demo" hides. It clears when the server accepts the request → Check your email. If the request fails while online: back to the form with the email kept and the field error "Couldn't send. Try again." (not drawn). [Mock] 1.4 s. |
| SIGNIN-04 | **Check your email**, identical for new and known emails (never reveals whether an account exists): title "Check your email", "We sent a link to **{email}**. Open it and this screen signs in by itself.", info tile (mail icon) "Link expires in 10 minutes", ghost "Use a different email" (returns to the form, email kept). The waiting screen polls `/api/auth/status` every 2 s until the link is opened, then moves to SIGNIN-06, SIGNIN-09 or SIGNIN-07. "I opened the link" is **dev only** [Mock]. |
| SIGNIN-05 | "Continue as demo" opens Today with demo (fixture) data. **Dev/demo builds only** (decided), hidden in production. |
| SIGNIN-06 | **First sign-in · "What's your name?"**, only when a new email opens its link, on the device that opened it, before Today. Returning sign-ins skip it. Eyebrow "New family account", title "What's your name?", body "This is the first sign-in for {email}. Your name shows in Settings." One field "Your name" (placeholder "First name is fine"), primary "Continue". Empty → "Add your name" (clears on the next keystroke). The name is trimmed and saved to `accounts.name`. |
| SIGNIN-07 | **Finish on your phone:** when the link opened on another device and the account has no name yet, the waiting screen shows "Finish on your phone" · "The link opened on another device. Add your name there and this screen signs in by itself." with a "Waiting for your name" tile. It signs in by itself once the name is saved. "I finished on my phone" is dev only [Mock]. |
| SIGNIN-08 | **Expired link, waiting screen:** 10 minutes with no open → "This link has expired" · "Sign-in links work for 10 minutes. Send a new one to {email}." Actions "Send a new link" and "Use a different email". |
| SIGNIN-09 | **Signed in:** on the waiting screen (or the device that opened the link), check icon, eyebrow "Signed in", title "Welcome, {first name}" (new account) or "Welcome back, {first name}" (returning), body "Opening Today…". Today opens after **2.2 s**, with no action needed. First name = the first word of `accounts.name`. |
| SIGNIN-10 | **Offline (form):** soft banner "You're offline" · "A link can't be sent right now. Sending turns back on when the screen reconnects." The send button is disabled and the email can still be typed. It clears on reconnect. Nothing is queued: the person taps Send again. Offline while waiting: keep Check your email and resume polling on reconnect. |
| SIGNIN-11 | Settings › Account › "Sign out" signs out **this screen only** (caption "Signs out this screen only."). Other screens with the same email stay signed in. No confirm step. Returns to the email form, empty. Changes still waiting to sync on this screen are discarded (accepted for v1). |
| SIGNIN-12 | **Link rules:** passwordless magic link for sign-up and sign-in. Opening a valid link for an unknown email creates the account; for a known email it signs in. Each link works **once, for 10 minutes**. Sending a new link voids older ones, so only the newest works. On the device that opened a stale link: "This link doesn't work anymore" · "It expired or was already used. Each link works once, for 10 minutes. Send a new one to {email}." + "Send a new link". "Send a new link" → Sending → Check your email (on that device). |

| SIGNIN-13 | **Session no longer valid:** if the server stops accepting this screen's session, the screen returns to the email form. Changes not yet synced are kept and sent if the same account signs in again. If a different account signs in, they're discarded. **Design requested** ([prompt 4](prompts/04-session-ended.md)): until it lands, use the SIGNIN-01 form as-is. |

Out of scope: changing the name or email, deleting the account, more than one email per account.

### 8.2 Today — `TODAY`
Zones: **hero** (block-1), **schedule** (white panel), **weather** (block-3), **notes** (white panel).

| ID | Requirement |
|---|---|
| TODAY-01 | Hero: season eyebrow, Clock, event summary, footer screen label "Glance" (mono eyebrow style). This replaces v2's "Rodriguez family · Kitchen" (decided). |
| TODAY-02 | Hero states: event running → eyebrow "Happening now", title, "{location} · until {end}". Running with no end → "{location} · started {start with AM/PM}" (TPK-08). None running but more later → "Up next", title, "{location} · {start with AM/PM}". All ended → "Nothing else today" / "Today's events have ended." No events → "Nothing scheduled" / "Events show here while they happen." |
| TODAY-03 | Tapping the hero event or any row opens Edit event. |
| TODAY-04 | Schedule eyebrow "Today · {n} events" / "Today · No events". Buttons: ghost "Add event" (+, only when the day has events) → New event on today. Ghost "Full calendar" → Calendar. |
| TODAY-05 | Rows move past → now → upcoming in real time. The hero swaps at each start and end (STATUS-01). |
| TODAY-06 | Empty schedule: soft tile, calendar icon, "No events yet" / "Add the first one. It shows here and on the calendar." + "Add event". |
| TODAY-07 | Picture of the day under the schedule (only when photos exist and the background is Season color): image + eyebrow "Picture of the day", title, "{date} · {place}". No photos → hairline tile "Picture of the day" / "Appears once someone uploads a photo." + ghost "Upload" → Photos. Selection: deterministic daily rotation by local date (decided): photos ordered oldest upload first, index = days since 1970-01-01 (local date) mod photo count. |
| TODAY-08 | Weather: `WeatherNow` (location, temp, condition, high/low, feels like). No location → "Weather needs a location" / "Set the city once and the forecast stays current." + "Set location" → Weather. |
| TODAY-09 | Notes eyebrow "Notes · {n}", ghost "All notes" → Notes. Shows only the **first two** notes. Tap → Edit note. Empty → "No notes yet" + "Add note". |
| TODAY-10 | On a photo background, Picture of the day is dropped. |
| TODAY-11 | Many events: the schedule list scrolls inside its column (decided). |

### 8.3 Calendar & events — `CAL`, `EVT`
Left: soft block with month name (year added outside the current year), prev/next IconButtons (56), `MonthGrid`. Right: white panel with eyebrow count, title "{Weekday}, {Mon} {d}", "Add event", rows, caption "Select an event to edit or delete it".

| ID | Requirement |
|---|---|
| CAL-01 | Tapping a day selects it (black). Heading and count update. Today keeps its ring. |
| CAL-02 | Days with events get a dot. Dots update as events are added or deleted. |
| CAL-03 | Chevrons step one month. The year rolls over. The selected day becomes the 1st, or today in the current month. The today ring shows only in its month. |
| CAL-04 | Count "{n} event(s)" / "No events". Empty day: "Nothing scheduled. A free day." No events at all: soft tile "The calendar is empty" / "Select a day, then add an event. Days with events get a dot." |
| CAL-05 | "Add event" creates on the selected day. Tapping a row → Edit event. |
| EVT-01 | Sheet title "New event" / "Edit event". Eyebrow "{Weekday}, {Mon} {d}". |
| EVT-02 | Fields: Title* (placeholder "What's happening"), Starts and Ends (TimeField, §8.3.1), Where ("Home, school, park…"), Color: 5 season swatches + **Alert** (accent). Default color 1. Swatches named by season color (e.g. Amber, Rust, Sage, Coral, Cream) with `aria-pressed`. |
| EVT-03 | Empty title → "Add a title", cleared on the next change. |
| EVT-04 | Time entry and end-after-start validation: see §8.3.1 (`TPK-*`). |
| EVT-05 | Primary label: "Add event" (new) / "Save" (edit) / "Save for later" (offline). Secondary "Cancel". |
| EVT-06 | Delete (edit only): ghost "Delete" → accent "Delete event" inline confirm → removes. |
| EVT-07 | Save closes the sheet. List, dots and Today update immediately. |

#### 8.3.1 Time entry — `TPK` (designed in handoff v2)
Two new components, built from DS tokens (marked `data-ds-new` in the prototype): **`TimeField`** and **`TimePicker`**. Open them with `sheet=event|newevent` + `time=start|end|error|noend`, `clock=24`, `net=offline`.

| ID | Requirement |
|---|---|
| TPK-01 | **TimeField:** label (body-lg) with the length on the right for Ends, in mono caption ("1 hr", "45 min", "1 hr 30 min"). A 56 px button with radius 8 and a 1 px hairline border shows the time (22 px tabular, 19 px on phone) plus mono AM/PM (15 px) and a chevron down/up. Open = black border + 2 px ring. Error = `--danger` border/ring + mono caption error below (`role="alert"`). `aria-expanded`, `aria-label` "{Starts\|Ends}, {time}. Change". |
| TPK-02 | Starts and Ends sit side by side (2 columns). Tapping a field opens the **TimePicker** below the row. One picker at a time. Tapping the open field or "Done" closes it. The sheet scrolls so the picker is in view. **No keyboard opens, and there is no typing path.** |
| TPK-03 | **TimePicker:** soft tile (radius 24, padding 16, or 12 on phone), `role="group"` labelled "Start time"/"End time". Header: eyebrow "{Starts\|Ends} · {time}" + AM/PM `PillTabs size="lg"` (12-hour only). "Hour" grid: 12-hour reads 12, 1 … 11; 24-hour reads 00 … 23. "Minutes" grid: 00 … 55 in 5-minute steps. Grid has 6 columns (4 on phone). Cells are 56 px pills (48 on phone): selected = black with weight 540, unselected = white with a hairline. Each tap changes one part and keeps the others, so any time takes 2–3 taps. |
| TPK-04 | The Ends picker adds "Length" chips (30 min · 1 hr · 1.5 hr · 2 hr), measured from Starts, and a ghost "No end time" (✕) button. The footer has a secondary "Done". |
| TPK-05 | **Defaults:** a new event starts at the next full half hour after now (10:41 → 11:00, 11:00 → 11:30), capped at 11:30 PM. Ends = Starts + 1 h, capped at 11:55 PM. The day comes from the eyebrow and can't be changed here. |
| TPK-06 | Changing Starts moves Ends by the same amount, keeping the length (capped at 11:55 PM). If Ends is empty or not after Starts, Ends stays put. |
| TPK-07 | **Validation:** Ends must be later than Starts **on the same day**. Equal times fail. The check runs on Save together with the title. Save stays enabled. A failed Save closes the picker and shows "Ends before it starts" under Ends. The error clears on the next change to any field. |
| TPK-08 | **No end:** the field reads "No end time" (weight 330). The event row shows only the start. Today's hero reads "{where} · started {time}". Tapping Ends again fills Starts + 1 h. |
| TPK-09 | The Clock setting drives both fields, the picker and the rows. Offline uses the same picker and rules, and Save reads "Save for later". |
| TPK-10 | Accessibility: cells use `aria-pressed`. Hour cells say "3 PM" in 12-hour or "15 hundred" in 24-hour. Minute cells say "{n} minutes". |

Internally the prototype stores times as **minutes of the day** (0–1435). Production converts them to ISO timestamps (§7) using the event's day and the browser's time zone.

### 8.4 Weather — `WX`
| ID | Requirement |
|---|---|
| WX-01 | Read-only. Left: `WeatherNow` "{location} · Now" with 4 details: Wind ("8 mph NW"), Humidity, UV index, Sunset. Right panel: Banner, "Next 8 hours" (8 soft tiles: time, icon, temp°), "7-day forecast" (7 `ForecastDay`, today highlighted, precip % only when present). |
| WX-02 | All values follow the unit setting. No unit letter. |
| WX-03 | Banner (online): icon cloud-rain, e.g. "Rain moving in after 4 PM" / "Grab an umbrella if you're heading out." Shown when any of the next 8 hours has precip ≥ 50% (decided). Offline: "Forecast from {time}" / "Updates when the screen is back online. Conditions may have changed." |
| WX-04 | Setup (no location): block-3 card, eyebrow "Weather · setup", "Where is this screen?", "The forecast on Today, Weather and the ambient screen uses this location.", input "City or ZIP code" (placeholder "Portland, OR"), "Show weather". Empty → "Enter a city or ZIP code". |
| WX-05 | Loading skeleton and failure state "Weather unavailable" / "The forecast service isn't responding. Trying again in {n} min." + "Try again" (§9). |
| WX-06 | Refresh every 15 min (decided). Editing the location later is still out of scope. |
| WX-07 | **Searching:** after "Show weather", the button is replaced by "Looking for {query}…" with a slow-pulsing search icon. Typing cancels the search. [Mock] 1.2 s. |
| WX-08 | **Unknown place:** error on the input "We couldn't find that place. Try a city and state, like Austin, TX". Clears on the next keystroke. |
| WX-09 | **Several matches** (e.g. "Portland"): eyebrow "{n} places called {city}", one 64 px row per match (city, with "{state}, United States" below). Tapping a row sets the location, with no extra confirm. Typing clears the list and brings back "Show weather". |

### 8.5 Notes — `NOTE`
White panel: eyebrow count, title "Notice board", "Add note". Grid `auto-fill minmax(220px,1fr)`, gap 36, StickyNotes (min-height 200). Caption "Select a note to edit or delete it · {expiry caption}".

| ID | Requirement |
|---|---|
| NOTE-01 | "Add note" → New note (eyebrow "Notice board"). Tap a note → Edit note (eyebrow "{author} · {time}"). |
| NOTE-02 | Fields: Message* (multiline, 3 rows, "Leave a note for the family"), Your name ("Optional"). Color: 5 swatches (no Alert). |
| NOTE-03 | Empty message → "Write a message". Blank name → "Guest". |
| NOTE-04 | New notes go first, stamped "Just now". Tilt cycles −2°, 1.5°, −1°, 2.5°. "Just now" ages into a time, then a weekday: "Just now" for the first 5 minutes, then the time (TIME-01 clock format) on the same day, the short weekday ("Tue") within the last 6 days, then "{Mon} {d}". |
| NOTE-05 | Primary "Post note" / "Save" / "Save for later". Delete → inline confirm "Delete note". |
| NOTE-06 | Count "{n} notes" / "1 note" / "No notes". Caption "Notes are removed after {1 day\|1 week}" or "Notes stay until deleted". |
| NOTE-07 | Empty board: "No notes yet" / "Leave a note for the family. Notes show on Today. {They're removed after X. \| They stay until someone deletes them.}" |
| NOTE-08 | Notes are deleted automatically after the expiry setting. **[Mock]** The server deletes them. Each screen also hides expired notes on its own, so they disappear even while offline. |
| NOTE-09 | Anyone at the display can edit or delete any note. Many notes: the board scrolls (decided). Moderation and character limit remain out of scope. |

### 8.6 Photos — `PHOTO`
Left: soft block with featured image (radius 8), eyebrow "{date} · {place}", title, prev / play-pause / next IconButtons. Right: white panel "Family photos · {n}", ghost "Upload", thumb grid (4:3, title + date; the selected thumb gets a ring `0 0 0 3px white, 0 0 0 5px black`).

| ID | Requirement |
|---|---|
| PHOTO-01 | Tapping a thumb features it. Chevrons step through and wrap at both ends. |
| PHOTO-02 | Slideshow auto-advances every **8 s** while Photos is open. Pause ↔ Play toggles it. Chevrons and thumbs keep it playing. |
| PHOTO-03 | Upload opens the system file picker (`image/*`, multiple). New photos go first, titled by file name without the extension, dated "Just now". Once saved, a photo's date is its EXIF date (or the upload date) and it has no place, so the eyebrow shows the date alone. |
| PHOTO-04 | Production upload: files are saved to disk via `/api/photos` (§7.0) with real progress. Size (≤ **20 MB**) and type (image) checks run **before** upload starts. |
| PHOTO-05 | Empty: soft block centered, image icon, eyebrow "Family photos · 0", "No photos yet", "Upload family photos to show them here, as the picture of the day and as a background." + "Upload photos". |
| PHOTO-06 | **Uploading:** each chosen file appears first in the grid right away: image at 60%, an 8 px progress bar inside the frame, mono "{n}%" ("Waiting" at 0). A soft row above the grid reads "Uploading {name}" (one) or "Uploading {n} photos" (several) + average %. Each tile becomes a normal photo at 100%. The row leaves when nothing is uploading. |
| PHOTO-07 | Uploading **never blocks the slideshow**: the featured photo and the 8 s timer use finished photos only. On a first upload, the featured frame reads "Your photos show here once they finish uploading." |
| PHOTO-08 | **Failure per file** (only that tile changes): "Too large · 20 MB max", "Not a photo", "Didn't upload" (network). Network failures get "Try again" (restarts at 0%) and "Remove". Too large and not a photo get "Remove" only, since a retry would fail again. Row reads "{n} photo(s) didn't upload". |
| PHOTO-09 | **Offline:** Upload buttons are disabled with the offline pill pattern (black pill, wifi-off) "Offline · upload when back online". Uploads in progress pause ("Paused") and resume on reconnect. Paused uploads are held in memory only and are lost if the page reloads (decided for v1). Row reads "Offline · {n} upload paused until back online". |

### 8.7 Settings & Background — `SET`, `BG`
Settings apply instantly. There is no Save button.

| ID | Requirement |
|---|---|
| SET-01 | Header: eyebrow "Screen settings", "Settings", "Signed in as **{name}** · {email}" (the account's person name from SIGNIN-06). |
| SET-02 | **Season** PillTabs Auto · Spring · Summer · Fall · Winter. Subtitle "Follows the month · now {Season}" / "Fixed to {Season}". Every color block cross-fades 600 ms. Auto re-checks at midnight. |
| SET-03 | **Background** row → Background page. Summary: "Season color" / "Photo · {title}" / "Slideshow · {interval}". |
| SET-04 | **Clock** 12-hour · 24-hour ("Used for every time on the screen"). Changes every time on screen (TIME-01). |
| SET-05 | **Temperature** Fahrenheit · Celsius ("Weather is shown without a unit letter"). |
| SET-06 | Schedule tile: "Ambient screen" · "6:00 PM – 7:30 AM" + "Preview" (moon) → Ambient. Hours are not editable in v1. |
| SET-07 | "Back to Today after" 1 min · 3 min · 5 min · Never. "Remove notes after" 1 day · 1 week · Never. |
| SET-08 | Account card: initial avatar (block-4, first letter of the name), name, "{email}" (no family name), "Sign out" with caption "Signs out this screen only." (SIGNIN-11). Changing name/email is out of scope. |
| BG-01 | Back link "‹ Settings", title "Background", PillTabs Season color · Photo · Slideshow. |
| BG-02 | Thumb grid (16:9) of all photos + "Upload photo" tile (same picker as PHOTO-03). Uploading tiles appear first, as in PHOTO-06/08, and finished uploads join the background list. Offline: the tile reads "Upload when online" (wifi-off) and is disabled. Label "Family photos · select one" / "Family photos · all {n} in rotation". |
| BG-03 | In Season color mode, thumbs show at 50% opacity. Tapping one switches to Photo. |
| BG-04 | Right: Preview (mini layout with block-1 / white / block-3 / bar on the current background), "Dim photo" Off 0 · Light 0.2 · Strong 0.4, "Change photo" Hourly · Daily · Weekly (Slideshow only). |
| BG-05 | Caption: "Screens use the plain seasonal palette. Pick a photo to switch." / "{title} is the background on every screen. Panels stay solid on top." / "Showing {title}. The photo changes {interval}; panels stay solid on top." |
| BG-06 | Photo background renders as `linear-gradient(rgba(0,0,0,dim) ×2), url(photo) center/cover`. Slideshow rotates on its interval with a 600 ms cross-fade. |

### 8.8 Ambient (quiet hours) — `AMB`
Full-screen button (no bar): background = season deep, or the photo with dim ≥ 0.5, text on-deep.

| ID | Requirement |
|---|---|
| AMB-01 | Top row: season icon + "{Season} · {Month}"; right: offline notice (if offline) and the screen label "Glance". |
| AMB-02 | Giant Clock (clamp 84–300 px). |
| AMB-03 | Bottom grid (hairline 20% white top): current weather "{temp}° · {condition}" / "Low {low}° overnight · {next notable day}". Next notable day (decided): the first of the next 6 days with precip ≥ 50% → "{Wkd} {p}% rain" (e.g. "Sat 80% rain"). None → "Low {low}° overnight" alone. Next to it, "Next event": "Tomorrow" or "{Wkd}, {Mon} {d}" · {start} · {title}, {where} — or "Nothing scheduled". |
| AMB-04 | Caption "Click or tap anywhere to wake". Tap anywhere → Today. The whole screen is one button with `aria-label` "Wake screen". |
| AMB-05 | Enters automatically at the schedule start and leaves at its end. After a wake tap during hours, it returns after the idle timeout. |
| — | Burn-in drift and screen dimming are recommended, not designed **[Open]**. |

### 8.9 Sheets (shared) — `SHEET`
- Modal over a 60% scrim that also covers the bar. Card radius 32, max-width 560, padding `clamp(24px,3vw,40px)`, shadow-3. Close IconButton 44.
- Tapping the scrim, Cancel or ✕ discards the draft. No dirty-check.
- The action row is sticky at the bottom: Delete on the left, Cancel + primary on the right.
- Offline: banner "You're offline" — event: "Changes save on this screen and sync when the connection is back."; note: "The note saves on this screen and posts when the connection is back."
- Focus is trapped while open. Focus order inside sheets is **[Open]** (proposed: title field → fields in visual order → swatches → actions).

---

## 9. Cross-cutting behavior

### 9.1 Time & clock — `TIME`
- TIME-02: The clock ticks every second. Event status recomputes every minute. Season Auto re-checks at midnight.
- TIME-03: A single `now` source (injectable for tests and the `?now=` fixture).

### 9.2 Idle timeout — `IDLE`
- IDLE-01: After no touch for the chosen time, any view returns to Today and open sheets are discarded.
- IDLE-02: Paused while a text field is focused.
- IDLE-03: During ambient hours, after a wake tap, idle returns to Ambient instead.

### 9.3 Loading — `LOAD`
- LOAD-01: Each source (calendar, weather, notes, photos) loads on its own. Zones fill in as they arrive. Clock, season and the "Glance" screen label are local and never wait.
- LOAD-02: Skeletons keep the final shape (no layout shift) and pulse 1.2 s. Shown only on first load with no saved data. Later refreshes swap in silently.
- LOAD-03: Over 10 s → that zone shows its failure state.
- Sources read saved data on the screen. "Loading" means nothing is saved yet and the first sync hasn't finished. "Failure" means that first sync, or the weather fetch, failed. Once data is saved, a failed sync only adds "Updated {time}" (FAIL-02). See [tech design](tech-design.md) §4.4.

### 9.4 Source failure (online) — `FAIL`
- FAIL-01: Only the failing zone changes: icon, "{Source} unavailable", retry countdown, "Try again".
- FAIL-02: If saved data exists, keep showing it and mark the zone "Updated {time}".
- FAIL-03: Auto-retry at 1, 2 and 5 min, then every 5 min.

### 9.5 Offline — `OFF`
- OFF-01: Black pill in the bar's left slot: wifi-off "Offline · showing saved data" + "Saved {time}" (time hidden on narrow and phone, and on Weather). Appears after **30 s** offline to avoid flicker. Leaves on reconnect.
- OFF-02: Saved data stays visible. Event statuses keep updating from the local clock.
- OFF-03: Weather older than 1 hour → "Forecast from {time}" banner.
- OFF-04: Edits queue locally. The sheet shows an offline banner, save reads "Save for later", and new notes show "Waiting to post" until synced.
- OFF-05: Ambient shows the same message in its top row (white mono).
- OFF-06: **Cold start offline.** A signed-in screen that reloads or restarts while offline opens Today from saved data, and every view works. Photos already synced to the account (background, slideshow, picture of the day) show even if this screen never displayed them.
- OFF-07: **Updates** to the app apply only while the screen is idle (Ambient, or Today after the idle timeout) and nothing is waiting to sync. The screen reloads itself once. Exception: if the server no longer accepts this version, the update applies at the next idle even with changes waiting. They're kept and sent by the new version.

### 9.6 On-screen keyboard — `KB`
- KB-01: Use the OS keyboard. Build on `visualViewport` resize (or `interactive-widget=resizes-content`), not fixed heights.
- KB-02: Sheets shrink to the space above the keyboard (280 ms), re-center, and scroll inside. The action row stays sticky.
- KB-03: Full-page forms (Sign in email, First sign-in name, Weather setup) pad the page by the keyboard height and scroll the focused field into view, 24 px below the top of the scroll area. Rows size to content, so the page scrolls instead of squeezing the hero.
- KB-04: Return in single-line fields moves to the next field. In Message it adds a line.
- The drawn keyboard in the prototype (`kb=1`) is a visual mock only. Do not build it.

### 9.7 Sync — `SYNC`
- SYNC-01: Settings, notes, events, photos and background are saved to the **account** in SQLite and sync to every display signed in to that account (the prototype persists nothing).
- SYNC-02: Transport (decided, [tech design](tech-design.md) §5). **Push:** each write is saved in IndexedDB together with an outbox entry. The sync engine sends outbox entries in order as idempotent `PUT`/`DELETE /api/{entity}/{id}`. **Pull:** `GET /api/sync?since={version}` returns every changed row, deletions included, plus the new cursor. `GET /api/sync/stream` (SSE) only signals that the account changed, which triggers a pull. Without SSE the client polls every 30 s. A pull never overwrites a row that still has a pending outbox entry.
- SYNC-03: Conflicts: last write **to reach the server** wins. The server stamps `updated_at` and `version`, so display clock drift doesn't matter. Offline edits (OFF-04) replay in order on reconnect. **Delete wins:** an edit to an event or note that another screen deleted doesn't bring it back. Settings are one record: if two screens change settings at the same moment, the later one replaces the whole set (accepted for v1).

### 9.8 Accessibility — `A11Y`
- Every IconButton has `aria-label`. Swatches use `aria-pressed` and color names. Sheets use `role="dialog"` with a label.
- Touch targets ≥ 44 px (56 on the kiosk bar).
- Text hierarchy comes from weight, not opacity (DS rule). Verify contrast of black text on every season block and on white panels over photos.

---

## 10. Copy deck
All user-facing strings live in one module (`src/copy.ts`) so they can be reviewed and translated later. **Confirmed by design in handoff v2**: the authoritative list is the "Copy changelog · office → family" at the top of `Glance - Behavior Notes.dc.html`. Summary (v3 rows: sign-in, screen label, account card and clock caption come from the v3 prototype; v3 strings for new states are in §8):

| Where | Prototype (office) | Glance (family) |
|---|---|---|
| Sign-in hero | …for Northwind HQ. Sign in to manage them. | …for your family. Sign in to manage them. (v3) |
| Sign-in body | Enter your work email. We'll send a link that signs you in on this device. | Enter your email. We'll send a link that signs this screen in. |
| Sign-in placeholder | name@northwind.com | name@example.com |
| Sign-in footer | Only members of your workspace can see… | Only your family can see… |
| Display label | Northwind HQ · Lobby | **Glance** (v3) |
| Calendar empty day | Nothing scheduled. Rooms are open for booking at the front desk. | Nothing scheduled. A free day. |
| Event field | Location · "Room or area" | Where · "Home, school, park…" |
| Rain banner body | Umbrellas are available at the front desk. | Grab an umbrella if you're heading out. |
| Note placeholder / empty | Leave a note for the team | Leave a note for the family |
| Photos | Team photos · {n} / Upload team photos… | Family photos · {n} / Upload family photos… |
| Account card | {email} · Northwind HQ | {name} · {email} only (v3) |
| Sign-in sent | Open it and this tab signs in by itself. | Open it and this screen signs in by itself. |
| Sign-in title | Welcome back | Sign in or get started (v3) |
| Clock setting caption | Used on Today and the ambient screen | Used for every time on the screen (v3) |
| Settings eyebrow | Display settings | Screen settings |
| Weather setup | Where is this display? | Where is this screen? |
| Offline banners | …when the display is back online / …saves on this display… | …when the screen is back online / …saves on this screen… |
| Ambient | Ambient · after hours / aria "Wake display" | Ambient · quiet hours / aria "Wake screen" |

Voice check for family copy: short words, no jargon ("display" → "screen" in user-facing text), and nothing that assumes an office (rooms, desk, booking, clients).

## 11. UI-first delivery plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Foundations** | Next.js + TS strict + Biome + StyleX scaffold (§3). Tokens as StyleX vars and season themes, `next/font/local`, Lucide, 15 DS components + shared pieces (§4.2), gallery route | DS-01 passes. Components match DS cards in all 4 seasons |
| **1. Shell & fixtures** | Routing, breakpoints, nav bar, season provider, `now` provider, fixture store loaded from the family fixtures (Appendix A), URL fixture params (§6) | Every route renders at the 6 board sizes |
| **2. Screens (static states)** | Family copy (§10). Today, Calendar, Weather, Notes, Photos, Settings, Background, Ambient, Sign in, Sheets — every state in §8 from fixtures | **Visual parity** with each `Glance Frames - *` board at 1920×1080, 1440×900, 1280×800, 1180×820, 820×1180, 390×844 (screenshot review) |
| **3. Interactions (local)** | Create/edit/delete events and notes, validation, calendar navigation, photo slideshow and upload (local), settings applied live, idle timeout, ambient schedule | Behavior notes reproduced end to end. Includes TimeField/TimePicker and the TPK rules (§8.3.1). Unit tests for status, time formatting, season mapping, temp conversion |
| **4. System states** | Skeletons, per-source failure and retry, offline pill and queue, keyboard handling | `net=loading\|offline\|wxerror` and `kb=1` frames match the System states board |
| **5. Real data** | SQLite schema and migrations (§7.0), Route Handlers, magic-link auth, account settings, SSE sync, weather proxy, photo storage on disk, offline shell (service worker) and sync worker, designed sign-in, upload and location states (§8.1, PHOTO-06..09, WX-07..09) | `FixtureTransport` swapped for `HttpTransport`. Repos and screens unchanged |

Phases 0–4 need no backend: each data source sits behind a repository interface (`EventsRepo`, `NotesRepo`, `PhotosRepo`, `WeatherRepo`, `SettingsRepo`). Repos always read and write the local IndexedDB store. Phases 0–4 use a `FixtureTransport` that seeds the store with Appendix A data, accepts pushes locally, and simulates weather, place search, sign-in and upload with the [Mock] delays. Phase 5 swaps in an `HttpTransport` that calls the Route Handlers. Screens never import a repo implementation or a transport directly.

---

## 12. Decisions

### 12.1 Resolved (2026-10-11)
| # | Question | Decision |
|---|---|---|
| 1 | Audience | **Family members.** Family copy deck (§10) |
| 2 | Settings scope | **Per account.** All displays of a family share settings (§7) |
| 3 | Time entry | **Designed in handoff v2** (TimeField + TimePicker, §8.3.1) |
| 4 | Stack | **Next.js (SPA) + TypeScript + Biome + StyleX + SQLite** (§3) |
| 5 | "Continue as demo" | Dev/demo builds only |
| 6 | Picture of the day | Deterministic daily rotation by local date |
| 7 | Weather | Refresh every 15 min. Rain banner when precip ≥ 50% in the next 8 h. Provider still open (below) |
| 8 | Past-day events | Struck through (past) |
| 9 | Overflow (events, notes) | Scroll inside the zone |
| 10 | Sync | SSE with polling fallback, last write wins (§9.7) |
| 11 | Undesigned states | **Designed in handoff v3** (prompt 3): sign-up/sign-in flow (§8.1), upload progress/failure/offline (PHOTO-06..09), location search (WX-07..09) |
| 12 | Account model | **One account per family, one email, no members.** Magic link for sign-up and sign-in. First sign-in asks for the person's name. Events, notes, photos and settings are per account |
| 13 | Screen label | **"Glance"** on the Today hero footer and Ambient. No family or screen name is stored |

| 14 | Hosting | One Docker container (`output: 'standalone'`) on a VPS or home server, volume at `/data` |
| 15 | Weather provider | Open-Meteo (forecast + geocoding), behind a `WeatherProvider` adapter |
| 16 | Time zone for server jobs | IANA zone stored on `accounts`, taken from the first display's browser |
| 17 | Query layer | Raw SQL with small typed helpers, no ORM. Runtime validation with Valibot |
| 18 | Magic-link email | Nodemailer over SMTP, configured by env vars |
| 19 | Client data and sync | Local-first IndexedDB store with an outbox. Server-stamped versions, last write to reach the server wins (§9.7) |

The full technical decision list (D1–D19) is in [`tech-design.md`](tech-design.md).

### 12.2 Still open
No technical items are open. The remaining **[Open]** markers are product and design questions: note character limit (§7), burn-in protection (§8.8) and focus order in sheets (§8.9).

## Appendix A — Fixture data
Family fixtures for Phases 1–4, **identical to the handoff v3 mock data**, so screens can be compared pixel for pixel with the frames. Frozen now: **Fri Oct 9 2026, 10:41 AM** (Ambient 7:12 PM). Account: maria@example.com (the known account), name "Maria". Any other email is a new account. Screen label "Glance". Upload fixtures (`upload=error`): "IMG_3307" too large, "Recipe card" not a photo, "Halloween costumes" network failure. Place search fixtures: "Portland" → Portland, OR / Portland, ME; "Springfield" → IL / MA / MO. The mock accepts any 5-digit ZIP or any query containing a comma, and treats anything else it doesn't know as unknown (`wx=unknown` uses "Pordland"). Weather location "Portland, OR".

**Events (Oct 2026):** 9th — School drop-off 9:00–9:30 AM Lincoln Elementary (soft) · Grandma's video call 10:30–11:15 AM Living room (1, *now*) · Lunch with Aunt Rosa 12:00–1:00 PM Café Lumen (2) · Dentist — Leo 2:00–2:20 PM Dr. Patel (accent) · Soccer practice 3:30–4:30 PM Laurelhurst Park (3). 2nd — Movie night 7:00–9:00 PM Living room (2). 14th — Parent-teacher conference 4:00–4:30 PM Lincoln Elementary (4). 22nd — Leo's birthday party 4:00–6:00 PM Home (3). 28th — Pumpkin carving 5:00–6:30 PM Back porch (1).

**Notes:** "Wi-Fi password is on the fridge!" Dad 8:12 AM (1, −2°) · "Package for Mia at the front door." Mom 9:05 AM (2, 1.5°) · "Window cleaner comes Wednesday — please leave blinds up." Mom Mon (3, −1°) · "Welcome home, Grandpa!" Mia Tue (4, 2.5°) · "Bike lock code changes Friday. Ask Dad." Dad Tue (soft, −1.5°).

**Weather (°F):** unchanged from the prototype. Now 64 Partly cloudy, H 68 / L 51, feels 62, wind 8 mph NW, humidity 62%, UV 3, sunset 6:42 PM. Hourly 11 AM–6 PM: 64, 66, 67, 68, 65, 61, 58, 56. Daily: Today 68/51 20% · Sat 59/48 80% · Sun 61/47 30% · Mon 66/49 · Tue 69/50 · Wed 65/50 10% · Thu 58/46 70%. Ambient: 56° Light rain.

**Photos:** Apple picking (Sep 27, Sauvie Island) · Pumpkin patch (Oct 4, Family outing) · Cannon Beach (Sep 6, Summer trip — default background and picture of the day) · First day of school (Sep 2, Lincoln Elementary) · Bike ride (Aug 30, Waterfront) · Forest Park trail (Aug 22, Weekend hike). Use bundled fixture images (not picsum.photos) so the app works offline. New-note draft in the keyboard frame: "Has anyone seen my blue umbr".
