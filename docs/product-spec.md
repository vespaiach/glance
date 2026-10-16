# Glance — Product Specification

| | |
|---|---|
| Status | Draft v0.39 — handoff v5 is specified but not built yet (execution plan Phase 9). Earlier versions: `git log` and the spec changes in [tech design §9](tech-design.md#9-spec-changes-from-this-design) |
| Technical design | [`docs/tech-design.md`](tech-design.md) — stack, architecture, project structure, sync protocol (D1–D23) |
| Date | 2026-10-15 |
| Design requests | Prompts sent to Claude Design, all delivered: [1 time entry](prompts/01-time-entry.md) and [2 family copy](prompts/02-family-copy.md) in handoff v2 (§8.3.1, §10), [3 sign-in and system states](prompts/03-signin-and-system-states.md) in v3 (§8.1, PHOTO-06..09, WX-07..09), [4 signed out](prompts/04-session-ended.md) and [5 location and time zone](prompts/05-location-and-time-zone.md) in v4 (SIGNIN-13, §9.9). v4 also added the Ambient screen page (SET-10) and v5 came with no prompt (decision 23). A new prompt goes in [`prompts/`](prompts/) as `NN-short-name.md` |
| Source of truth | [`docs/design/handoff/Glance.dc.html`](design/handoff/Glance.dc.html) (prototype) · [`Glance - Behavior Notes.dc.html`](design/handoff/Glance%20-%20Behavior%20Notes.dc.html) · [`Glance Frames.dc.html`](design/handoff/Glance%20Frames.dc.html) |
| Approach | Design-driven, UI first: build every screen and state against fixtures, then connect real data |

Requirement IDs (`TODAY-03`, `NOTE-05` …) are meant to be cited in tickets, PRs and tests. **[Mock]** marks behavior the prototype fakes that needs a real implementation. **[Open]** marks a decision that has not been made yet (see §12.2).

---

## 1. Product overview

**Glance** is a responsive web app that works as a **family wall calendar**: a shared calendar, weather, notice board and photo frame for one household. It runs on wall-mounted or stand-mounted touch screens (1920×1080 and 1280×800), laptops, tablets (iPad portrait 820) and phones (390).

- **Primary user: any family member at the display**, kids included. Reads the screen from across the room, taps to see details, adds a note or event. Doesn't sign in at the display.
- **Secondary user: the account holder (usually a parent).** Owns the family's single account (one email). Signs screens in, manages settings, uploads photos.
- **Voice:** "a calm family noticeboard." Warm but brief, sentence case, readable from 2 m, words a child can read. Never "I". "You" only in instructions.

> **Decided (2026-10-11): the audience is family members.** Handoff v2 re-copied the prototype, boards and mock data for families (the copy changelog is at the top of the behavior notes). Layouts, components and behavior are unchanged from v1.

### 1.1 Goals
1. Anyone in the room can see "what's happening now / next", today's weather and family notes at a glance.
2. Anyone at the display can add or edit events and notes without signing in.
3. The display stays readable and useful when offline, when a data source fails, and during quiet hours (Ambient).

### 1.2 Non-goals for v1 (not designed)
Calendar sync (Google/Outlook) · recurring and multi-day events · note moderation, character limit, board overflow · photo albums · photo upload on phones (future: hidden in v1, §5.4) · weather alert rules, forecast-day detail · places outside the United States, more than one location per account or per-screen locations · guided setup, renaming or remotely signing out other screens (the signed-in list is read-only, SET-12), roles (e.g. parent vs. child permissions) · per-person colors or filters · session expiry, kiosk lock · burn-in protection.

---

## 2. Precedence of sources

**Primary source of truth: [`docs/design/handoff/Glance.dc.html`](design/handoff/Glance.dc.html)**, the working prototype (markup and logic). Layout, copy, states and component usage are taken from it first.

Secondary references fill in what the prototype can't show. If one conflicts with the prototype, the prototype wins. If secondary references conflict with each other, the earlier one wins:

2. [`Glance - Behavior Notes.dc.html`](design/handoff/Glance%20-%20Behavior%20Notes.dc.html): interactions, timers and states the screens can't show
3. [`docs/design/handoff/README.md`](design/handoff/README.md): handoff overview and data needs
4. Design system `docs/design/handoff/_ds/…/readme.md`: tokens and component foundations

The handoff README was last updated in v4: its nav bar, "Not designed" list and URL params predate v5, so the v5 behavior notes win where they differ.

Known conflicts where the handoff overrides the design system:

| Topic | Design system says | Glance does |
|---|---|---|
| Navigation | TopBar at the top (88 px) plus a bottom Ticker | Nav bar at the **bottom**, 88 px with labels on wide and mid, 72 px icons only on narrow and phone, hides when idle (SHELL-06), **no Ticker** |
| Canvas | White gutters around color blocks | The season-color canvas (soft grey-tinted, `--hairline-soft`) sits behind white panels, so one layout works on the season color and on a photo (handoff v5) |
| Backgrounds | Solid flat color only, no photos | Photo, Slideshow and dim modes. Text zones sit on white panels |
| Brand | "Kiosk" | "Glance" (plain Geist 540, no logo) |
| Audience and copy | Lobbies, offices, schools | Family home (handoff v2 copy, §10) |
| Tokens | CSS custom properties | StyleX `defineVars` / `createTheme` (§4.1). Values unchanged |
| Type sizes | Fixed px for the 1920 kiosk (clock 168, display-xl 86…) | Smaller fluid `clamp()` overrides on the app root so the app fits laptops and tablets (§4.3). Mono captions 14 px minimum (16 px on Ambient). All text black, no grey or dimmed text |
| Spacing | Free values | The 8 px scale only: 4, 8, 12, 16, 24, 32 (handoff v5) |
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
- **No `output: 'export'`.** SQLite, the photo files and the SSE bus need one running Node server (`next build && next start`) with a **persistent disk** (tech design D17).
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
| `Clock` | `time: Date, hour12=true, showDate=true, size: 'xl'\|'lg', align: 'left'\|'center'` | Tabular numerals. `time` is the live `Date` from `useNow()`; the Clock has no timer of its own. Date line "Friday, October 9" |
| `EventRow` | `start, end, title, location, status: 'past'\|'now'\|'upcoming', dot: Tone, nowLabel, compact, onClick` | Past = struck through, hairline dot (v5: no grey). Now = season fill and NOW pill (`nowLabel`). `compact` = the phone columns (§5.4). With `onClick` the row is a button |
| `MonthGrid` | `year, month (0-11), selected, today, marked[], onSelect, showTitle, cell` | Selected = black (`aria-pressed`). Today = ring (`aria-current="date"`). Marked = dot. Day buttons are labelled with the full date |
| `Button` | `variant: primary\|secondary\|ghost\|accent\|inverse\|danger, size: md\|lg, icon, iconRight, fullWidth, disabled` | Always a pill (radius 50). `danger` (handoff v5, not in the DS bundle) = `--danger` fill, white text, in every season: the delete and discard confirms (EVT-06, NOTE-05, PHOTO-13, §8.9) |
| `IconButton` | `icon, variant: soft\|canvas\|solid\|inverse, size: md\|touch\|lg, label, active, current` | `md` = 40, `touch` = 56, `lg` = 72 px. `active` = black. `current="page"` sets `aria-current` (nav bar) |
| `PillTabs` | `options[], value, onChange, size, label` | Segmented control used for every Settings choice. A group named by `label`, options are buttons with `aria-pressed` (A11Y-02) |
| `TextInput` | `label, value, onChange, placeholder, multiline, rows, error` | 2 px black focus ring. Error text below |
| `TopBar` | `brand, center, right, height, inverse` | Used as the bottom nav bar, `brand=""`, height 88 with labels (wide, mid) or 72 (narrow, phone). The buttons go in `right`; on phone in `center`, spread edge to edge (SHELL-01) |
| `ColorBlock` | `tone: 1-4\|soft, padding, radius` | Never shadowed |
| `Card` | `variant: hairline\|soft\|canvas\|elevated, title, eyebrow, onClick` | With `onClick` the card is a button |
| `Banner` | `icon, title, body, actionLabel, onAction, tone` | |
| `WeatherNow` | `location, temp, condition, icon, high, low, feelsLike, details[], labels, tone=3` | Temperatures arrive already in the display unit, so there is no `unit` prop (WX-02). `labels` = the "H" / "L" / "Feels like" copy. `tone` also takes `deep` |
| `ForecastDay` | `day, icon, high, low, precip?, active, onClick?` | With `onClick` the tile is a button |
| `StickyNote` | `children, author, time, tone: NoteTone, rotate, width, minHeight, onClick` | Radius 6, shadow-2. With `onClick` the note is a button |
| `Eyebrow`, `Icon` | — | Mono uppercase label. Lucide wrapper |
| `Ticker` | — | **Not used** in Glance |

New components designed in handoff v2 (not in the DS bundle): **`TimeField`**, **`TimePicker`** (§8.3.1). Other shared pieces the screens need (not in the DS):

| Component | Props | Notes |
|---|---|---|
| `TimeField` | `label, value?, clock, length?, open, error, labels{noEnd, change}, onToggle, compact` | TPK-01. `value` in minutes of the day; none = "No end time" (TPK-08). `length` in minutes, shown as `formatLength`. `compact` = phone (19 px time) |
| `TimePicker` | `label, groupLabel, value, clock, labels, onChange, onDone, ends?{start, lengths[{value, label}], onNoEnd}, compact` | TPK-03/04/10. `onChange` gets the new minutes of the day. `ends` adds the Length chips and "No end time". `compact` = phone (4 columns, 48 px cells, 12 px padding) |
| `Skeleton`, `SkeletonBlock` | `label` · `width, height, radius` | The group pulses 1.2 s; blocks are black at 0.1, so they read 0.06–0.1. The group is a busy `status` named by `label` ("Loading events") |
| `EmptyState` | `icon, title, body, eyebrow, action, size: md\|lg, align: start\|center` | Icon · title · body · one action (any button the screen passes). `md` = zone (28 px title), `lg` = whole view (display-xl title) |
| `SourceFailure` | `icon, title, body, retryLabel, onRetry, eyebrow, size` | An `EmptyState` with a secondary "Try again" (`rotate-cw`). `body` carries the retry countdown text. A `status` |
| `Sheet` | `title, eyebrow, closeLabel, onClose, children, startActions, endActions` | §8.9. `role="dialog"`, `aria-modal`, labelled by its title |
| `ColorSwatchPicker` | `label, options[{value: Tone, label}], value, onChange` | 44 px round swatches, `aria-pressed`, named by color. Selected = white + black ring |
| `OfflinePill` | `label, meta` | Black pill, wifi-off, `status`. The shell places it (§5.4) |
| `SettingsRow` | `title, description, children, onClick, divider` | Title + description on the left, control on the right. With `onClick` the row is a button with a chevron |
| `Zone` | `state: ZoneState<T>, loading, empty, failed, children(data, updatedAt)` | Renders one of the four states (§9.3–9.5) inside its own error boundary, which shows `failed` if the content throws |

Components live in `src/ui/` and are styled only with StyleX. Each accepts an optional `xstyle` prop (a StyleX style) for layout overrides from the caller, in place of the prototype's `style` prop. `ui` can't import `copy.ts`, so any words a component shows (NOW, H/L) come in as props from the screen. Weather `icon` props take the domain `WeatherIcon` key.

**Acceptance (DS-01):** a dev-only gallery route (`/dev/gallery`, excluded from production builds) renders every component in all 4 seasons, grouped like the DS cards (Core, Forms, Surfaces, Calendar, Weather, Notes, Navigation) plus Time entry, Shared pieces and Zone states. The DS card HTML is not in the handoff, so the cards are compared by eye, not embedded.

### 4.3 Fluid type and gutters
Values for the `type` vars (exact values from the prototype, shown here as CSS for reference):

```css
--type-clock-size: clamp(84px, 6.8vw, 128px);   --type-clock-ls: -4px;   /* v5: was clamp(84px, 7.4vw, 112px) */
--type-temp-size:  clamp(76px, 6.4vw, 96px);    --type-temp-ls:  -3px;
--type-display-xl-size: clamp(36px, 3.6vw, 52px); --type-display-xl-ls: -1px;
--type-display-lg-size: clamp(28px, 2.6vw, 40px);
--type-headline-size: 20px; --type-headline-ls: -0.2px;
--type-body-lg-size: 18px; --type-body-size: 16px; --type-body-sm-size: 15px;
--type-button-size: 17px; --type-eyebrow-size: 14px; --type-caption-size: 14px;   /* v5: captions 14 px minimum */
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
- `<main>` scrolls. Padding = gutter on top and sides, 16 px at the bottom (v5, was 24).
- **Nav bar (SHELL-01):** bottom, sticky, hairline top edge. Seven IconButtons, `size="touch"` (56 px): **Today** `house`, **Calendar** `calendar-days`, **Weather** `cloud-sun`, **Notes** `sticky-note`, **Photos** `image`, **Ambient** `moon` (named "Ambient screen"), then a 1 px hairline divider (40 px tall, 24 px of space around it) and **Settings** `settings`. The divider keeps Ambient apart from Settings. They sit together at the right end of the bar, inside a `nav` named "Views", named by `aria-label`. **Labels** (handoff v5): wide and mid show a 14 px label under each icon (Today, Calendar, Weather, Notes, Photos, Ambient, Settings; weight 540 on the active one, 400 otherwise), hidden from assistive tech, and tapping the label works like the icon; the bar is 88 px tall with labels and 72 px without. Narrow and phone are icons only (phone: §5.4).
- **SHELL-02:** active view = black button with `aria-current="page"`. Settings stays active on its sub-pages (Background, Location, Ambient screen). Ambient is never shown active: it opens the Ambient screen at once from any view, outside the schedule too (AMB-08).
- **SHELL-03:** the bar is hidden on Sign in and Ambient.
- **SHELL-04:** changing view closes any open sheet and resets `main` scroll to the top.
- **SHELL-05:** with a photo background, every zone with text sits on a white panel (radius 24). Color blocks and the bar stay solid. Without a photo, the canvas behind the panels is the season-color canvas (`--hairline-soft`, §2).
- **SHELL-06: the bar hides when idle** (handoff v5, setting SET-11, default On). After **20 s** with no touch the bar slides down and fades out (280 ms) and the view takes the full height; Today then shows more event rows when they fit (TODAY-11). It doesn't hide while a sheet is open, a text field is focused, the on-screen keyboard is up, or on full-screen Photos (PHOTO-14, which has its own controls). The Back to Today timeout (IDLE-01) lands on Today with the bar hidden. With SET-11 Off the bar stays docked. Not on Sign in or Ambient, which have no bar (SHELL-03).
- **SHELL-07: handle and reveal.** While hidden, a white 72×44 pill with a chevron-up sits centered 12 px above the bottom edge (hairline, level-2 shadow), named "Show menu". Any touch shows the bar **and still does its normal job**: the first tap is never swallowed. The revealed bar **floats** over the bottom edge (upward level-2 shadow), so nothing moves under the finger. It docks again on the next view change, and hides again after 20 s without a touch. Fixtures: `bar=hidden|float` (board frames Today E–F), `barauto=off` (SET-11 Off). As with every fixture, the 20 s timer doesn't run in a frozen URL state; it runs after a tap.

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
- Nav: all seven buttons (44 px) spread edge to edge across the bar (`space-between`) with no brand slot, so Settings stays on screen at 390 px. The divider stays, with no extra space around it.
- EventRow columns `56px 10px 1fr auto`, gap 12, padding `12px 8px` (other sizes: `84px 14px 1fr auto`, padding `14px 16px`).
- Offline pill sits 84 px from the bottom (OFF-01 gives the other sizes).

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
| `/settings/location`, `/settings/ambient` | Location (SET-09), Ambient screen (SET-10) |
| `/ambient` | Ambient |

Fixture params: `bg=photo`, `sheet=event|newevent|note|newnote`, `time=start|end|error|noend`, `clock=24`, `season=spring|summer|fall|winter`, `empty=1`, `net=loading|offline|wxerror`, `kb=1`, `signin=form|sending|sent|name|phone|expired|offline|done` (+ `on=link` with `expired` = the device that opened the link, `acct=returning` with `done` = "Welcome back"), `upload=one|progress|error|offline` (with `/photos` or `/settings/background`), `wx=searching|unknown|choose`, plus the handoff v4 states: `signin=ended|location` (+ `pending={n}` waiting changes, `switch=1` another email entered), `wx=locating|no-position|denied|outside|lookup|tz|savefail` (with `/weather`, `/settings/location` or `signin=location`), `amb=same|split|off` and `pick=all.s|all.e|wknd.s|wknd.e` (with `/settings/ambient`), plus the handoff v5 states: `sheet=allday|photo|photometa` (the all-day fixture event, a photo whose details were guessed from the file name, one whose date and place came from the photo), `discard=1` (the open sheet asks "Discard changes?"), `events=many` (9 events on Oct 9, TODAY-11), `allday=1` (an all-day event on Oct 9), `upload=done` (with `/photos`), `full=1` (+ `chrome=0`, with `/photos`), `signin=sendfail`, `bar=hidden|float`, `barauto=off`. The prototype's `day=16` is `/calendar?date=2026-10-16`. The prototype's `view=` and `sub=` become the routes above (`view=settings&sub=location` → `/settings/location`, `view=ambient` → `/ambient`). Plus `now=ISO` to freeze the clock (replaces the hardcoded Fri Oct 9 2026 10:41). URL states are frozen snapshots; timers only run after a tap.

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
  allDay?: true;    // v5 (EVT-08): the event fills its date; startAt is that date's UTC midnight and endAt is absent,
                    // so it stays on its date in every time zone (tech design D21)
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

interface Photo {
  id: string;
  title: string;          // "Name" in Photo details (PHOTO-12), required
  takenOn?: string;       // ISO date; absent = "No date"
  place?: string;         // "City, ST" or free text
  createdAt: string;
  sources: {              // v5 (PHOTO-10/12): where each value came from, for the source captions
    title: 'photo' | 'file-name' | 'place' | 'file' | 'edited';            // metadata title · file name words · the place's city · raw file name
    takenOn: 'photo' | 'file-name' | 'file-date' | 'none' | 'edited';      // date taken · date in the name · file modified date
    place: 'photo-location' | 'none' | 'edited';                            // GPS turned into "City, ST"
  };
  checked: boolean;       // details saved once in Photo details; the "guessed" hint shows until then (PHOTO-10)
}
// The image URL is derived: /api/photos/{id}/file?v=display|thumb|orig
// v5: photos are editable (PHOTO-12) and deletable (PHOTO-13), so they sync like events: Synced<Photo> with tombstones.

interface Weather {
  location: string;
  fetchedAt: string;
  current: { temp: number; condition: string; icon: LucideWeatherIcon; high: number; low: number;
             feelsLike: number; windMph: number; windDir: string; humidity: number; uv: number; sunset: string };
  hourly: Array<{ time: string; icon: LucideWeatherIcon; temp: number; precip?: number }>; // 8 points; precip % feeds the WX-03 rain banner
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
  hideBarWhenIdle: boolean;           // v5, SET-11 (SHELL-06). Default true; rows saved before v0.38 read the default
  ambient: { mode: 'same' | 'split' | 'off';        // SET-10: Every night · Weekends differ · Off. Default 'same'
             all:  { start: string; end: string };  // "HH:MM", 15-min steps. Every night, or Sun–Thu nights when split. Default 18:00–07:30
             wknd: { start: string; end: string } };// Fri & Sat nights when split. Default 21:00–09:00. Kept while not split
                      // end < start = the next morning; start = end = that set is "Not set" and never runs (SET-10)
                      // a night belongs to the day it starts, or to the day before when it starts before noon (SET-10)
  weatherLocation?: { name: string; region: string; lat: number; lon: number; timeZone?: string };
                      // the place picked in WX-04/09, LOC-01 or SET-09; lat/lon rounded to 2 decimals;
                      // timeZone = its IANA zone (LOC-05), absent on places saved before v0.32
}

interface Account { id: string; email: string; name: string | null; /* person's name, "Maria"; null until first sign-in completes */ }
interface Display { id: string; accountId: string; }  // one signed-in screen; the screen label is always "Glance"
// v5 (SET-12) lists the account's screens with a device type (monitor, tablet, smartphone), a name and when each was
// last active. Where the type and the name come from is [Open] (§12.2): the design names screens ("Kitchen screen")
// but draws no way to name one, and v1 stores no screen name (decision 13).
```

**Account model (decided 2026-10-11):** one family = **one account = one email**. There are **no members** and no per-person logins. Sign-up and sign-in are the same magic-link flow (SIGNIN-12).

**Scope rule:** events, notes, photos and settings belong to the **account**. A display is a signed-in session on one screen. It holds no settings of its own, so changing a setting on one display changes it on every display of that family (synced via §9.7).

### 7.0 SQLite schema (v1)

```sql
CREATE TABLE accounts  (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                        name TEXT, time_zone TEXT NOT NULL,                -- IANA zone sent by the waiting screen with the link request
                        setup_done_at TEXT,                                -- set when the first-run location step ends (saved or skipped, SIGNIN-14); filled from created_at for accounts made before v0.34
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
- Timestamps are ISO-8601 UTC strings. Display uses the location's time zone (`weatherLocation.timeZone`), else the browser's (LOC-06). Server jobs use the location's time zone, else `accounts.time_zone` (LOC-07).
- `updated_at` and `version` are always stamped by the server. Every write bumps `sync_state.version` in the same transaction and copies it to the row. `/api/sync?since=` returns rows with a higher `version` (§9.7).
- Soft deletes (`deleted_at`) let other displays receive deletions through `/api/sync`.
- Photo files are stored on disk (`{DATA_DIR}/photos/{account}/{id}.{orig|display|thumb}`) and served through an authenticated route. On upload, `sharp` makes a display copy (≤ 2560 px) and a thumb (≤ 640 px) in WebP. Only metadata goes in SQLite.
- **Handoff v5 additions** (planned, execution plan Phase 9, as a migration after the PostgreSQL schema of Phase 8): `events.all_day` (boolean, default false; an all-day row has `end_at` NULL and `start_at` at its date's UTC midnight); `photos` gains `updated_at`, `deleted_at`, the three `*_source` columns and `checked` (PHOTO-10..13), and `taken_on` may be NULL ("No date"); the QR sign-in (SIGNIN-15) and the signed-in list (SET-12) change `magic_links` and `displays` (tech design §6.6). Deleting a photo also deletes its files.
- Note expiry (NOTE-08) runs server-side on an hourly timer: soft-delete notes whose age since `createdAt` is past `noteExpiry` (24 hours or 7 days). It is the same rule the screens use to hide notes, so the server and the screen agree and the time zone doesn't change the result.

Defaults: season Auto, 12-hour, Fahrenheit, background Season color (dim Light, rotate Daily), idle 3 min, notes 1 week, hide bar when idle On.

### 7.1 Derived event status (STATUS-01)
For each event on today: `past` if `end ≤ now`, `now` if `start ≤ now < end`, otherwise `upcoming`. An event with no end (TPK-08) is `now` from its start to the end of its day. **All-day events (EVT-08) have no status:** they never become the hero, never show as Happening now or Up next, and are never struck through. Recompute every minute. Events on other days: past days → `past` (struck through, decided), future days → `upcoming`. The prototype rendered every non-today event as upcoming.

### 7.2 Time formatting (TIME-01)
| Context | 12-hour | 24-hour |
|---|---|---|
| Clock, hero start ("Up next", "started"), sunset, ambient, sync time | `10:41 AM` (mono AM/PM) | `10:41` |
| Hero "until {end}" | `until 11:15` (no AM/PM) | `until 11:15` |
| Event rows, ranges | `10:30 – 11:15` (no AM/PM) | `10:30 – 11:15` |
| Hourly forecast | `4 PM` | `16:00` |

---

## 8. Screens

Each screen lists **Behavior**, **States** and **Acceptance**. All copy is exact. Copy in `{braces}` is interpolated.

### 8.1 Sign in & account — `SIGNIN` (designed in handoff v3; SIGNIN-13 and SIGNIN-14 in v4)
Layout: left = season block-1 hero ("Glance" wordmark, season eyebrow "{Season} · {Month}", live Clock, "Calendar, weather, notes and photos for your family. Sign in to manage them."). Right = form, max-width 560. The lock footer "Only your family can see its calendar, notes and photos." stays in every form state.

One flow for sign-up and sign-in (account model §7). The screen that asks for the link becomes the **waiting screen**. The link can be opened on that screen or on another device, usually a phone.

| ID | Requirement |
|---|---|
| SIGNIN-01 | **Email form**, the same for new and returning families: eyebrow "One account per family", title "Sign in or get started", body "Enter your email. We'll send a link that signs this screen in. New here? The same link sets up your family's Glance." Email field (placeholder `name@example.com`), primary "Send sign-in link" (→ icon). No "Continue as guests" (removed in handoff v5, SIGNIN-05). |
| SIGNIN-02 | Validation `name@domain.tld`. Invalid → "Enter a valid email address", cleared on the next keystroke. |
| SIGNIN-03 | **Sending:** after a valid "Send sign-in link", the button reads "Sending…" and is disabled, the email can't be edited, a soft tile reads "Sending a link to {email}" with a slow-pulsing mail icon. It clears when the server accepts the request → Check your email. If the request fails while online: back to the form with the email kept and editable, and the field error "Couldn’t send. Try again." in the TextInput error style; it clears on the next keystroke, and "Send sign-in link" retries (drawn in handoff v5: Account board frame Y, fixture `signin=sendfail`). [Mock] 1.4 s. |
| SIGNIN-04 | **Check your email**, identical for new and known emails (never reveals whether an account exists): title "Check your email", "We sent a link to **{email}**. Open it and this screen signs in by itself.", info tile (mail icon) "Link expires in 10 minutes", ghost "Use a different email" (returns to the form, email kept). The waiting screen polls `/api/auth/status` every 2 s until the link is opened, then moves to SIGNIN-06, SIGNIN-09 or SIGNIN-07. "I opened the link" is **dev only** [Mock]. |
| SIGNIN-05 | ~~"Continue as guests"~~ **Removed** (handoff v5: it was a prototype shortcut). Demo builds don't need it: they open on fixture data and skip the sign-in gate (tech design §6.5), so `/today` opens directly and `/signin` shows only for its own fixture states. |
| SIGNIN-06 | **First sign-in · "What's your name?"**, only when a new email opens its link (the account has no name yet), on the device that opened it, before Today. Returning sign-ins skip it. "Continue" goes on to SIGNIN-14. Eyebrow "New family account", title "What's your name?", body "This is the first sign-in for {email}. Your name shows in Settings." One field "Your name" (placeholder "First name is fine"), primary "Continue". Empty → "Add your name" (clears on the next keystroke). The name is trimmed and saved to `accounts.name`. A waiting screen whose own browser opened the link (another tab) is that device too, so it asks for the name as well. "Continue" is disabled while it saves; if the save fails, the name step stays with the name kept and the field error "Couldn’t save. Try again." (not drawn). |
| SIGNIN-07 | **Finish on your phone:** when the link opened on another device and the account has no name yet, the waiting screen shows "Finish on your phone" · "The link opened on another device. Add your name and this screen’s location there, and this screen signs in by itself." with a "Waiting for your phone" tile. The name and location steps (SIGNIN-06, SIGNIN-14) run on the phone. The waiting screen signs in by itself once the name is saved and the location step has ended (a place saved or skipped); the server records that end, so the waiting screen keeps showing this step until then. If the phone leaves the location step unfinished, the waiting screen keeps waiting until its link expires or someone taps "Use a different email". "I finished on my phone" is dev only [Mock]. |
| SIGNIN-08 | **Expired link, waiting screen:** 10 minutes with no open → "This link has expired" · "Sign-in links work for 10 minutes. Send a new one to {email}." Actions "Send a new link" and "Use a different email". |
| SIGNIN-09 | **Signed in:** on the waiting screen (or the device that opened the link), check icon, eyebrow "Signed in", title "Welcome, {first name}" (new account) or "Welcome back, {first name}" (returning), body "Opening Today…". Today opens after **2.2 s**, with no action needed. First name = the first word of `accounts.name`. The device that opened the link lands on the sign-in screen and checks the link first (nothing shows in the panel meanwhile): a named account whose first setup is finished → this step; an account with no name → SIGNIN-06, then SIGNIN-14; a named account whose location step never ended → SIGNIN-14; a stale link → SIGNIN-12; if the check can’t reach the server, the empty email form (not drawn). |
| SIGNIN-10 | **Offline (form):** soft banner "You're offline" · "A link can't be sent right now. Sending turns back on when the screen reconnects." The send button is disabled and the email can still be typed. It clears on reconnect. Nothing is queued: the person taps Send again. Offline while waiting: keep Check your email and resume polling on reconnect. |
| SIGNIN-11 | Settings › Account › "Sign out" signs out **this screen only** (caption "Sign out this device only.", SET-08). Other screens with the same email stay signed in. No confirm step. Returns to the email form, empty. Changes still waiting to sync on this screen are discarded (accepted for v1). |
| SIGNIN-12 | **Link rules:** passwordless magic link for sign-up and sign-in. Opening a valid link for an unknown email creates the account; for a known email it signs in. Each link works **once, for 10 minutes**. Sending a new link voids older ones, so only the newest works. On the device that opened a stale link: "This link doesn't work anymore" · "It expired or was already used. Each link works once, for 10 minutes. Send a new one to {email}." + "Send a new link". "Send a new link" → Sending → Check your email (on that device). A stale link opened on a screen that is still signed in signs it in (SIGNIN-09) instead. When the stale link’s email isn’t known (an unknown or already removed link), the device opens the empty email form. **The email** (plain text): subject "Your Glance sign-in link"; body "Open this link to sign in to Glance:", the link, "It works once, for 10 minutes. New here? The same link sets up your family’s Glance." and "If you didn’t ask for it, you can ignore this email." |

| SIGNIN-13 | **Signed out by the server** (designed in handoff v4). **Trigger:** the screen is online and the server no longer accepts its sign-in (a 401, for example after the family's account was reset). Rare: sign-ins don't expire in v1, and Sign out on another screen signs out only that screen (SIGNIN-11). Never while offline: an offline screen keeps working from saved data and checks again on reconnect. No reason is shown. **Form:** the SIGNIN-01 form (same hero, lock footer, no bar) with a soft banner on top, "This screen was signed out" · "Sign in again to keep the calendar, notes and photos up to date.", title "Sign in again", body "Check your family’s email below. We’ll send a link that signs this screen back in." The email is prefilled with the account's last email and stays editable. Send sign-in link → Sending → Check your email → Signed in work as usual. **Waiting changes** (events or notes saved but not synced, OFF-04): the banner adds "Changes waiting on this screen: {n}. They’ll be sent after you sign in." (the same wording for 1 and for n). They stay on this screen until a sign-in finishes. **Different email:** inline, no confirm step. When the field holds another address and changes are waiting, a soft tile under the field reads "Changes waiting on this screen belong to {previous email}. They’ll be removed from this screen if a different email signs in." with a ghost "Use {previous email}" that puts the email back, and the banner drops "They’ll be sent after you sign in." Sending stays allowed; nothing is removed until the other email's sign-in finishes. **Timing:** it never interrupts an edit. While an event or note sheet is open or a text field is focused, the view stays; Save or Post keeps the change on this screen as waiting (it joins the count), Cancel discards as usual. The form shows as soon as the sheet closes, or at the idle timeout (IDLE-01, which pauses while a field is focused and discards open sheets as usual). During ambient hours the idle timeout goes to Ambient instead, with the AMB-07 notice. A screen already on the form stays on it when ambient hours start. In Ambient, see AMB-07. **Signed in again:** SIGNIN-09 "Welcome back, {first name}", then Today. The same email: the waiting changes sync as usual. A different email: they are removed from this screen when its sign-in finishes, and a new email goes through SIGNIN-06 and SIGNIN-14. **Clears** only when a sign-in finishes (any email). A reload, "Use a different email" and an expired link keep the screen signed out and the notice on the form. Fixtures: `signin=ended`, `&pending=3`, `&switch=1` (another email entered), `&sheet=newnote` (a sheet open when it happens), `/ambient?signin=ended`, `signin=done&acct=returning` (signed in again). Account board frames S–X (drawn in handoff v5). |
| SIGNIN-14 | **First sign-in · "Where is this screen?"** (designed in handoff v4), only while the account's first setup isn't finished: right after SIGNIN-06 on the same device, before Signed in, or on the next sign-in of an account whose location step never ended (a phone closed mid-step). Same hero, full-page form and keyboard rules as SIGNIN-06 (KB-03). Eyebrow "New family account", title "Where is this screen?", body "The weather and the clock’s time zone follow this place. You can change it later in Settings." The setup card (WX-04): field "City or ZIP code", primary "Continue", secondary "Use my location" (LOC-01); below a hairline, ghost "Skip for now". Searching, several matches, locating and every failure behave as WX-07..09 and LOC-02..03. A found place (a single match, a picked match or a located one) is saved to the account's settings (it carries the time zone, LOC-05) → Signed in. No time zone confirm here: the first place always sets the zone (LOC-09). "Skip for now" → Signed in and cancels any search or locating; Weather then shows WX-04 and Settings › Location reads "Not set". Saving or skipping ends the first setup on the server (§7.0 `setup_done_at`), which lets a waiting screen sign in (SIGNIN-07). If the save fails, the step stays with the place kept in the field and the field error "Couldn’t save. Try again."; "Continue" saves the same place again. Editing the field drops that place, and "Continue" then searches as usual. A skip that fails shows the same error and "Skip for now" retries. On a phone that opened the link this step runs on the phone (SIGNIN-07). Returning sign-ins skip it. Fixtures: `signin=location` with `wx=locating\|choose\|denied\|savefail`, `kb=1`. |
| SIGNIN-15 | **Sign in another device with a QR code** (handoff v5). In Settings › Account, under the signed-in list (SET-12): secondary "Sign in another device" (`qr-code` icon). Tap → replaced in place by a block-1 tile: the QR code on white, title "Scan to sign in", body "Open the camera on the other device and point it at the code. It signs in with {email}.", mono caption "Code expires in {m:ss}" counting down from 5:00 each second (tabular figures), ghost "Done" closes it and stops the countdown. The code opens a **one-time sign-in link for this account** that skips the email step: the device that opens it signs in as SIGNIN-09 "Welcome back, {first name}" (the account always has a name and a finished setup here). At 0:00 a new code replaces it and the countdown restarts at 5:00 while the tile is open; a code works once and for 5 minutes, and a new code voids the old one. Not in the design, added here: closing the tile voids the open code, and offline the button is disabled, like the other online-only actions. The new device joins the list (SET-12) once signed in. [Mock] the QR is a static pattern. [Open] (§12.2): anyone in the room can scan the code. |

Out of scope: changing the name or email, deleting the account, more than one email per account.

### 8.2 Today — `TODAY`
Zones: **hero** (block-1), **schedule** (white panel), **weather** (block-3), **notes** (white panel).

| ID | Requirement |
|---|---|
| TODAY-01 | Hero: season eyebrow, Clock, then the event summary. No "Glance" label or wordmark in the hero (handoff v5 removed v3's footer label). |
| TODAY-02 | Hero states (timed events only; all-day events never take the hero, STATUS-01): event running → eyebrow "Happening now", title, "{location} · until {end}". Running with no end → "{location} · started {start with AM/PM}" (TPK-08). None running but more later → "Up next", title, "{location} · {start with AM/PM}". All ended → "Nothing else today" / "Today's events have ended." No events → "Nothing scheduled" / "Events show here while they happen." |
| TODAY-03 | Tapping the hero event or any row opens Edit event. |
| TODAY-04 | Schedule eyebrow "Today · {n} events" / "Today · 1 event" / "Today · No events"; all-day events count. Buttons: ghost "Add event" (+, only when the day has events) → New event on today. Ghost "Full calendar" → Calendar. |
| TODAY-05 | Rows move past → now → upcoming in real time. The hero swaps at each start and end (STATUS-01). |
| TODAY-06 | Empty schedule: soft tile, calendar icon, "No events yet" / "Add the first one. It shows here and on the calendar." + "Add event". |
| TODAY-07 | Picture of the day under the schedule (only when photos exist and the background is Season color): image + eyebrow "Picture of the day", title, "{date} · {place}". No photos → hairline tile "Picture of the day" / "Appears once someone uploads a photo." + ghost "Upload" → Photos. **Selection** (handoff v5, replaces the v1 rotation): one photo per calendar day, the same on every screen of the account; it changes at midnight in the location's time zone (LOC-06). First choice: a photo taken on today's month and day in an earlier year, with the eyebrow "On this day · {year}" (several → the oldest year first [not in the design]). Otherwise the next photo in a **shuffled cycle**: every photo shows once before any repeats, and photos added mid-cycle join the end of it. "On this day" days don't use up a cycle turn [not in the design]. Only finished uploads count. If today's photo is deleted (PHOTO-13), the next one in the cycle replaces it at once. [Mock] fixed to Cannon Beach; the fixtures keep Cannon Beach on Oct 9 (Appendix A). |
| TODAY-08 | Weather: `WeatherNow` (location, temp, condition, high/low, feels like). No location → "Weather needs a location" / "Set the city once. The forecast and the clock follow it." + "Set location" → the Weather setup card (decided in handoff v4: it stays on Weather, not Settings › Location). |
| TODAY-09 | Notes eyebrow "Notes · {n}", ghost "All notes" → Notes. Shows only the **first two** notes (the two newest, NOTE-04). Tap → Edit note. Empty → "No notes yet" + "Add note". |
| TODAY-10 | On a photo background, Picture of the day is dropped. |
| TODAY-11 | **More events than fit** (handoff v5, replaces scrolling inside the column): the schedule shows as many rows as fit and, at the bottom, a full-width soft button "See all {n} events" with a mono count on the right ("1 earlier · 3 later"; only the parts that apply). Ended events are hidden first, then the latest upcoming ones; Happening now and the next events always stay. Rows that fit: wide and landscape mid = ⌊(window height − bar height − 360 px − 64 px per all-day tile) ÷ 76⌋, kept between 4 and 8; portrait mid, narrow and phone = 6. The button takes one row's place. When the bar is hidden (SHELL-06) its height is 0, so more rows fit. Tap → Calendar on today. Fixture `events=many` (board frame Today C). |
| TODAY-12 | **All-day events** (EVT-08) show as soft tiles (min height 56, radius 8) above the timed rows, in event order: mono "ALL DAY", color dot, title, place. Tap → Edit event. They are never struck through. Fixture `allday=1` (board frame Today D). |

### 8.3 Calendar & events — `CAL`, `EVT`
Left: soft block with month name (year added outside the current year), prev/next IconButtons (56), `MonthGrid`. Right: white panel with eyebrow count, title "{Weekday}, {Mon} {d}", "Add event", rows, caption "Select an event to edit or delete it".

| ID | Requirement |
|---|---|
| CAL-01 | Tapping a day selects it (black). Heading and count update. Today keeps its ring. |
| CAL-02 | Days with events get a dot, including days with only all-day events. Dots update as events are added or deleted. |
| CAL-03 | Chevrons step one month. The year rolls over. The selected day becomes the 1st, or today in the current month. The today ring shows only in its month. |
| CAL-04 | Count "{n} event(s)" / "No events"; all-day events count. Empty day: "Nothing scheduled. A free day." No events at all: soft tile "The calendar is empty" / "Select a day, then add an event. Days with events get a dot." |
| CAL-05 | "Add event" creates on the selected day. Tapping a row → Edit event. |
| CAL-06 | **All-day events** in the day list: soft tiles (mono "ALL DAY", dot, title, place) above the timed rows, as TODAY-12. Tap → Edit event. Fixture `/calendar?date=2026-10-16` (board frames Calendar K–L). |
| CAL-07 | On narrow and phone, tapping a day whose heading is below the fold scrolls the view just enough to show the heading and the first event; the month stays mostly in view (handoff v5). |
| EVT-01 | Sheet title "New event" / "Edit event". Eyebrow "{Weekday}, {Mon} {d}". |
| EVT-02 | Fields: Title* (placeholder "What's happening"), a "Time" row with "Set times · All day" PillTabs (large, 56 px, EVT-08), Starts and Ends (TimeField, §8.3.1), Where ("Home, school, park…"), Color: 5 season swatches + **Alert** (accent). Default color 1. Swatches named by season color (e.g. Amber, Rust, Sage, Coral, Cream) with `aria-pressed`. |
| EVT-03 | Empty title → "Add a title", cleared on the next change. |
| EVT-04 | Time entry and end-after-start validation: see §8.3.1 (`TPK-*`). |
| EVT-05 | Primary label: "Add event" (new) / "Save" (edit) / "Save for later" (offline). Secondary "Cancel". |
| EVT-06 | Delete (edit only): ghost "Delete" → "Delete event" inline confirm → removes. The confirm is a red `danger` button (white text) in every season, no longer the season accent (handoff v5). |
| EVT-07 | Save closes the sheet. List, dots and Today update immediately. |
| EVT-08 | **All day** (handoff v5): "All day" hides Starts, Ends and any open picker; the event fills its date (§7 `allDay`). Switching back to "Set times" restores the times the draft had, or the TPK-05 defaults for a new event. All-day events skip the TPK-07 check. They show as tiles on Today and in the day list (TODAY-12, CAL-06), count everywhere, have no status (STATUS-01), and read "All day" in Ambient's "Next event" (AMB-03). Fixture `sheet=allday` (board frame Calendar L). Multi-day events stay out of scope. |

#### 8.3.1 Time entry — `TPK` (designed in handoff v2)
Two new components, built from DS tokens (marked `data-ds-new` in the prototype): **`TimeField`** and **`TimePicker`**. Open them with `sheet=event|newevent` + `time=start|end|error|noend`, `clock=24`, `net=offline`.

| ID | Requirement |
|---|---|
| TPK-01 | **TimeField:** label (body-lg) with the length on the right for Ends, in mono caption ("1 hr", "45 min", "1 hr 30 min"). A 56 px button with radius 8 and a 1 px hairline border shows the time (22 px tabular, 19 px on phone) plus mono AM/PM (15 px) and a chevron down/up. Open = black border + 2 px ring. Error = `--danger` border/ring + mono caption error below (`role="alert"`). `aria-expanded`, `aria-label` "{Starts\|Ends}, {time}. Change". |
| TPK-02 | Starts and Ends sit side by side (2 columns). Tapping a field opens the **TimePicker** below the row. One picker at a time. Tapping the open field or "Done" closes it. The sheet scrolls so the picker is in view (the picker scrolls itself into view when it opens). **No keyboard opens, and there is no typing path.** |
| TPK-03 | **TimePicker:** soft tile (radius 24, padding 16, or 12 on phone), `role="group"` labelled "Start time"/"End time". Header: eyebrow "{Starts\|Ends} · {time}" + AM/PM `PillTabs size="lg"` (12-hour only). "Hour" grid: 12-hour reads 12, 1 … 11; 24-hour reads 00 … 23. "Minutes" grid: 00 … 55 in 5-minute steps. Grid has 6 columns (4 on phone). Cells are 56 px pills (48 on phone): selected = black with weight 540, unselected = white with a hairline. Each tap changes one part and keeps the others, so any time takes 2–3 taps. |
| TPK-04 | The Ends picker adds "Length" chips (30 min · 1 hr · 1.5 hr · 2 hr), measured from Starts, and a ghost "No end time" (✕) button. The footer has a secondary "Done". |
| TPK-05 | **Defaults:** a new event starts at the next full half hour after now (10:41 → 11:00, 11:00 → 11:30), capped at 11:30 PM. Ends = Starts + 1 h, capped at 11:55 PM. The day comes from the eyebrow and can't be changed here. |
| TPK-06 | Changing Starts moves Ends by the same amount, keeping the length (capped at 11:55 PM). If Ends is empty or not after Starts, Ends stays put. |
| TPK-07 | **Validation:** Ends must be later than Starts **on the same day**. Equal times fail. Not checked for an all-day event (EVT-08). The check runs on Save together with the title. Save stays enabled. A failed Save closes the picker and shows "Ends before it starts" under Ends. The error clears on the next change to any field. |
| TPK-08 | **No end:** the field reads "No end time" (weight 330). The event row shows only the start. Today's hero reads "{where} · started {time}". Tapping Ends again fills Starts + 1 h. |
| TPK-09 | The Clock setting drives both fields, the picker and the rows. Offline uses the same picker and rules, and Save reads "Save for later". |
| TPK-10 | Accessibility: cells use `aria-pressed`. Hour cells say "3 PM" in 12-hour or "15 hundred" in 24-hour. Minute cells say "{n} minutes". |

Internally the prototype stores times as **minutes of the day** (0–1435). Production converts them to ISO timestamps (§7) using the event's day and the screen's time zone (LOC-06).

### 8.4 Weather — `WX`
| ID | Requirement |
|---|---|
| WX-01 | Read-only. Left: `WeatherNow` "{location} · Now" with 4 details: Wind ("8 mph NW"), Humidity, UV index, Sunset. Right panel: Banner, "Next 8 hours" (8 soft tiles: time, icon, temp°), "7-day forecast" (7 `ForecastDay`, today highlighted, precip % only when present: a chance of 10% or more). The place reads "{city}, {state code}", e.g. "Portland, OR". |
| WX-02 | All values follow the unit setting. No unit letter. With °C the wind shows in km/h ("13 km/h NW"). |
| WX-03 | Banner (online): icon cloud-rain, e.g. "Rain moving in after 4 PM" / "Grab an umbrella if you're heading out." Shown when any of the next 8 hours has precip ≥ 50% (decided); the time is the first such hour. Offline: "Forecast from {time}" / "Updates when the screen is back online. Conditions may have changed." |
| WX-04 | Setup (no location): block-3 card, eyebrow "Weather · setup", "Where is this screen?", "The forecast and the clock’s time zone follow this place. You can change it later in Settings.", input "City or ZIP code" (placeholder "Portland, OR"), then one row: primary "Show weather" and secondary "Use my location" (locate icon, LOC-01, shown only when the device can locate itself; otherwise the card is as before). Empty → "Enter a city or ZIP code". The same card is used by Settings › Location (primary "Search", SET-09) and the first-run step (primary "Continue", SIGNIN-14). |
| WX-05 | Loading skeleton and failure state "Weather unavailable" / "The forecast service isn't responding. Trying again in {n} min." + "Try again" (§9). |
| WX-06 | Refresh every 15 min (decided). The location is changed from Settings › Location (SET-09). |
| WX-07 | **Searching:** after "Show weather", the button is replaced by "Looking for {query}…" with a slow-pulsing search icon. Typing cancels the search (its answer is ignored). If the search fails (offline, or the service errors), the field shows "Place search isn’t responding. Try again in a moment." and keeps the text; it clears on the next keystroke. [Mock] 1.2 s. |
| WX-08 | **Unknown place:** error on the input "We couldn't find that place. Try a city and state, like Austin, TX". Clears on the next keystroke. |
| WX-09 | **Several matches** (e.g. "Portland"): eyebrow "{n} places called {city}", one 64 px row per match (city, with "{state}, United States · {time zone name}" below, LOC-08, e.g. "Maine, United States · Eastern time"). Tapping a row sets the location, and with it the screen's time zone (LOC-05), with no extra confirm. Typing clears the list and brings back "Show weather". A single match (e.g. a ZIP code) is set at once with no list, and "Looking for {query}…" stays until the forecast view takes over. The search covers the United States, takes a city, "City, ST" / "City, State" or a ZIP code, and lists at most 5 matches (largest first). |

### 8.5 Notes — `NOTE`
White panel: eyebrow count, title "Notice board", "Add note". Grid `auto-fill minmax(220px,1fr)`, gap 36, StickyNotes (min-height 200). Caption "Select a note to edit or delete it · {expiry caption}".

| ID | Requirement |
|---|---|
| NOTE-01 | "Add note" → New note (eyebrow "Notice board"). Tap a note → Edit note (eyebrow "{author} · {time}"). |
| NOTE-02 | Fields: Message* (multiline, 3 rows, "Leave a note for the family"), Your name ("Optional"). Color: 5 swatches (no Alert). |
| NOTE-03 | Empty message → "Write a message". Blank name → "Guest". |
| NOTE-04 | Notes are listed newest first (by creation time), so new notes go first, stamped "Just now". Tilt cycles −2°, 1.5°, −1°, 2.5°. "Just now" ages into a time, then a weekday: "Just now" for the first 5 minutes, then the time (TIME-01 clock format) on the same day, the short weekday ("Tue") within the last 6 days, then "{Mon} {d}". |
| NOTE-05 | Primary "Post note" / "Save" / "Save for later". Delete → inline confirm "Delete note" (red `danger` button, handoff v5). |
| NOTE-06 | Count "{n} notes" / "1 note" / "No notes". Caption "Notes are removed after {1 day\|1 week}" or "Notes stay until deleted". |
| NOTE-07 | Empty board: "No notes yet" / "Leave a note for the family. Notes show on Today. {They're removed after X. \| They stay until someone deletes them.}" |
| NOTE-08 | Notes are deleted automatically after the expiry setting. **[Mock]** The server deletes them. Each screen also hides expired notes on its own, so they disappear even while offline. |
| NOTE-09 | Anyone at the display can edit or delete any note. Many notes: the board scrolls (decided). Moderation and character limit remain out of scope. |

### 8.6 Photos — `PHOTO`
Left: soft block with featured image (radius 8), name and "{date} · {place}" (PHOTO-11), prev / play-pause / next IconButtons, then full screen (`maximize`, last, PHOTO-14). Right: white panel "Family photos · {n}", ghost "Upload", thumb grid (4:3; the selected thumb gets a ring `0 0 0 3px white, 0 0 0 5px black`). Thumb caption (v5): name and date on one center-aligned row, the date in black 14 px mono.

| ID | Requirement |
|---|---|
| PHOTO-01 | Tapping a thumb features it. Chevrons step through and wrap at both ends. |
| PHOTO-02 | Slideshow auto-advances every **8 s** while Photos is open. Pause ↔ Play toggles it. Chevrons and thumbs keep it playing. |
| PHOTO-03 | Upload opens the system file picker (`image/*`, multiple). New photos go first. Their name, date and place are filled in from the photo as it uploads (PHOTO-10), replacing v1's "file name, upload date, no place". Board frame Photos I (`upload=done`). |
| PHOTO-04 | Production upload: files are saved to disk via `/api/photos` (§7.0) with real progress. Size (≤ **20 MB**) and type (image) checks run **before** upload starts. |
| PHOTO-05 | Empty: soft block centered, image icon, eyebrow "Family photos · 0", "No photos yet", "Upload family photos to show them here, as the picture of the day and as a background." + "Upload photos". |
| PHOTO-06 | **Uploading:** each chosen file appears first in the grid right away: image at 60%, an 8 px progress bar inside the frame, mono "{n}%" ("Waiting" at 0). A soft row above the grid reads "Uploading {name}" (one) or "Uploading {n} photos" (several) + average %. Each tile becomes a normal photo at 100%. The row leaves when nothing is uploading. |
| PHOTO-07 | Uploading **never blocks the slideshow**: the featured photo and the 8 s timer use finished photos only. On a first upload, the featured frame reads "Your photos show here once they finish uploading." |
| PHOTO-08 | **Failure per file** (only that tile changes): "Too large · 20 MB max", "Not a photo", "Didn't upload" (network). Network failures get "Try again" (restarts at 0%) and "Remove". Too large and not a photo get "Remove" only, since a retry would fail again. Row reads "{n} photo(s) didn't upload". |
| PHOTO-09 | **Offline:** Upload buttons are disabled with the offline pill pattern (black pill, wifi-off) "Offline · upload when back online". Uploads in progress pause ("Paused") and resume on reconnect: an upload still running carries on, and one whose send failed while offline starts again from 0%. Paused uploads are held in memory only and are lost if the page reloads (decided for v1). Row reads "Offline · {n} upload paused until back online". |
| PHOTO-10 | **Name, date and place from the file** (handoff v5), read on upload, each in this order. **Name:** the title in the photo's metadata → words in the file name (camera prefixes such as `IMG_`, `DSC`, `PXL`, dates and runs of digits removed; it needs a real word of 3+ letters) → the place's city → the raw file name without its extension. **Date:** the date taken in the metadata → a date in the file name (`2025-10-31`, `20251031`) → the file's modified date. **Place:** GPS in the metadata, turned into "City, ST" (US only, like LOC-04); no GPS or no US place → empty. Each value remembers its source (§7 `Photo.sources`). Guessed values get a soft hint under the featured photo: "Name and date guessed from the file name.", "Date guessed from the file date.", plus "No place found." when there is no place. The hint goes once the details are saved in Photo details (PHOTO-12). [Mock] the place lookup is faked. Fixtures: `halloween-costumes-2025-10-31.jpg` → "Halloween costumes", Oct 31 2025, no place (`sheet=photo`); `IMG_4410.JPG` with metadata → "Cannon Beach", Aug 16 2026, Cannon Beach, OR (`sheet=photometa`). |
| PHOTO-11 | **Featured photo** shows its name and "{date} · {place}": the year is added outside the current year, and a photo with no date reads "No date". A pencil button opens Photo details and pauses the slideshow. |
| PHOTO-12 | **Photo details sheet** (Sheet, §8.9): title "Photo details", eyebrow = the file name (or "Family photos"). A 16:9 preview, then **Name** (required), **Date taken** (a date field, no future dates), **Place** (optional). No color. Each field has a mono source caption on the right: "From photo", "From photo location", "Guessed from file name", "Guessed from file date", "Guessed from place", "Not in photo"; any change to the field turns it into "Edited". Empty name → "Add a name" on Save. Name and place are trimmed. Save updates the photo everywhere (grid, featured, background list, picture of the day). Changes sync like events (§9.7); offline, Save reads "Save for later" with the sheet's offline banner [not in the design]. Board frames Photos J–K (`sheet=photo`, `sheet=photometa`). |
| PHOTO-13 | **Delete photo** (in Photo details): ghost "Delete" → inline confirm "Delete photo" (red `danger` button), then the photo leaves Photos, the background list, the slideshow and picture of the day (TODAY-07) on every screen, and its files are deleted. [Open] (§12.2): deleting the photo that is the background (what replaces it) isn't designed. |
| PHOTO-14 | **Full screen** (handoff v5). Opens by tapping the featured photo or the full-screen button, only when at least one photo has finished uploading. A black screen above everything, bar included; the whole photo shows uncropped (contain), letterboxed in black. Top row: mono "{n} of {total}" and "Exit full screen" (`minimize`). Bottom row: name, "{date} · {place}", Previous, Play/Pause, Next. White-on-black `inverse` IconButtons, 56 px. Tapping the photo hides or shows both rows (hidden gives the photo the whole screen); opening always starts with them shown. The slideshow keeps its state and 8 s timer; the chevrons wrap as in the grid. No edit button here. Keyboard: Esc exits, ← → step, Space plays or pauses. It closes on Exit, on any view change and on the idle timeout (IDLE-01, back to Today), and returns to Photos with the same photo featured. A `dialog` named "{name} · full screen". Fixtures `full=1`, `&chrome=0` (rows hidden; board frames Photos L–M). |

### 8.7 Settings & Background — `SET`, `BG`
Settings apply instantly. There is no Save button. Settings, Background and Ambient screen choices use the large PillTabs (56 px), which wrap onto more rows when they don't fit (handoff v5).

| ID | Requirement |
|---|---|
| SET-01 | Header: eyebrow "Screen settings", "Settings", "Signed in as **{name}** · {email}" (the account's person name from SIGNIN-06). |
| SET-02 | **Season** PillTabs Auto · Spring · Summer · Fall · Winter. Subtitle "Follows the month · now {Season}" / "Fixed to {Season}". Every color block cross-fades 600 ms. Auto re-checks at midnight. |
| SET-03 | **Background** row → Background page. Summary: "Season color" / "Photo · {title}" / "Slideshow · {interval}". |
| SET-04 | **Clock** 12-hour · 24-hour ("Used for every time on the screen"). Changes every time on screen (TIME-01). |
| SET-05 | **Temperature** Fahrenheit · Celsius ("Weather is shown without a unit letter"). |
| SET-06 | Schedule tile: "Ambient screen" · its hours ("6:00 PM – 7:30 AM", "Sun – Thu 6:00 PM – 7:30 AM · Fri & Sat 9:00 PM – 9:00 AM" or "Off") → Ambient screen page (SET-10). A set with the same dim and wake time reads "Not set" in its place ("Not set", or "Sun – Thu Not set · Fri & Sat 9:00 PM – 9:00 AM"). |
| SET-07 | "Back to Today after" 1 min · 3 min · 5 min · Never. "Remove notes after" 1 day · 1 week · Never. |
| SET-08 | Account card: initial avatar (block-4, first letter of the name), name, "{email}" (no family name), then the signed-in screens (SET-12) and "Sign in another device" (SIGNIN-15). Last, below a hairline: "Sign out" (SIGNIN-11) with the caption "Sign out this device only." as a note on the left (info icon + black mono caption) and the button on the right (space-between), so it doesn't read as a second action. Changing name/email is out of scope. |
| SET-09 | **Location** row, **first** in the Settings panel (it changes the clock and every time on the screen): "Location" · "Sets the weather and the time zone" · summary "{city}, {state code} · {time zone name}" ("Portland, OR · Pacific time", LOC-08) or "Not set" → **Location page** (like Background: "‹ Settings" back button, white panel; Settings stays active in the bar; fixture `/settings/location`). Left: a "Now set to" tile with the place and "{time zone name} · {clock}" ("Pacific time · 10:41 AM"), or "Not set" · "Times follow this device’s own clock"; then "Change location" ("Set location" while not set) with the setup card (WX-04, primary "Search", "Use my location") and its states (WX-07..09, LOC-02..03). Right: a soft block "What the location sets": Weather ("The forecast on Today, Weather and the ambient screen") and Time zone ("Pacific time for the clock, Today, the calendar and event times", or "The clock, Today, the calendar and event times" while no zone is set), a caption ("The clock and event times follow Pacific time, even if this device is set to a different time.", or "Until a location is set, times follow this device’s own clock.") and the line "Shared by every screen on this account". A found place in the **same** time zone saves at once and returns to Settings, and the row summary updates; one in a **different** time zone asks first (LOC-09). A place saved before v0.32 (no zone) shows its name with "Times follow this device’s own clock" and a summary without a zone. |
| SET-10 | **Ambient screen page** (same shell as Location and Background, fixture `/settings/ambient`). "Schedule" PillTabs Every night · Weekends differ · Off (default Every night, 6:00 PM – 7:30 AM). Weekends differ splits it into "Sun – Thu nights" and "Fri & Sat nights" (default 9:00 PM – 9:00 AM); a night belongs to the day it starts, and a dim time before noon belongs to the night before (12:30 AM early Saturday is Friday night, so it uses the Fri & Sat set), matching the noon-to-noon bars. Switching modes keeps both sets of times. Each set has two TimeFields, "Dims at" and "Wakes at"; Wakes at shows the length ("13 hr 30 min"), counted past midnight when the wake time is earlier than the dim time (the next morning). Tapping a field opens the TimePicker under its set (TPK-02/03): AM/PM, hour cells, minutes 00 · 15 · 30 · 45 only, "Done"; one picker at a time; tapping the open field closes it; with the 24-hour clock, 24 hour cells and no AM/PM. The same dim and wake time: Wakes at shows the error "Same as dim time", that set's bar reads "Not set", and Ambient doesn't run for that set until it is fixed. Off: the times hide and a tile reads "The screen stays bright all day and night."; the right block reads "No ambient hours." and "Touch-to-wake and the idle timer work as usual." Right: a soft block "Over 24 hours" with one bar per set, noon to noon, the ambient span filled dark, and under it "After a touch it dims again when nobody has touched it for {n} min." (from SET-07; Never → "After a touch it stays awake until the next ambient start."), plus "Preview" (moon) → Ambient (a manual entry, AMB-08). Changes apply at once, like every setting. Fixtures: `amb=same\|split\|off` (`same` = Every night with the same dim and wake time, 6:00 PM – 6:00 PM, board frame Q; `split` and `off` set the mode), `pick=all.s\|all.e\|wknd.s\|wknd.e` (that field's picker open). |
| SET-11 | **Hide bar when idle** (handoff v5): On · Off (default On), the **last row** of the main Settings panel, under Temperature. Subtitle "After 20 seconds without a touch. Any tap brings it back." Off keeps the bar docked (SHELL-06). Shared by every screen of the account, like every setting. Fixture `barauto=off`. |
| SET-12 | **Signed-in screens** (handoff v5), in the Account card: eyebrow "{n} screens signed in", then a soft-tile list of every device signed in with this email. Row: device-type icon (`monitor`, `tablet`, `smartphone`) in a white circle, the device name, and a mono caption: "This screen" for this device (listed first, with a seasonal accent dot), else "Active {time} ago" / "Active yesterday" / "Active {Mon} {d}", newest first. Read-only in v1: no rename and no remote sign-out. The list is read from the server when Settings opens; offline, or if that read fails, it shows only this screen [not in the design]. [Open] (§12.2): the device type and name. [Mock] the list is fixed sample data (Appendix A). |
| BG-01 | Back link "‹ Settings", title "Background", PillTabs Season color · Photo · Slideshow. |
| BG-02 | Thumb grid (16:9) of all photos + "Upload photo" tile (same picker as PHOTO-03). Uploading tiles appear first, as in PHOTO-06/08, and finished uploads join the background list. Offline: the tile reads "Upload when online" (wifi-off) and is disabled. Label "Family photos · select one" / "Family photos · all {n} in rotation". |
| BG-03 | In Season color mode, thumbs show at 50% opacity. Tapping one switches to Photo. |
| BG-04 | Right: Preview (mini layout with block-1 / white / block-3 / bar on the current background), "Dim photo" Off 0 · Light 0.2 · Strong 0.4, "Change photo" Hourly · Daily · Weekly (Slideshow only). |
| BG-05 | Caption: "Screens use the plain seasonal palette. Pick a photo to switch." / "{title} is the background on every screen. Panels stay solid on top." / "Showing {title}. The photo changes {interval}; panels stay solid on top." |
| BG-06 | Photo background renders as `linear-gradient(rgba(0,0,0,dim) ×2), url(photo) center/cover`. Slideshow rotates on its interval with a 600 ms cross-fade: photos go in upload order (oldest first, wrapping), the next one showing at each local hour (Hourly), midnight (Daily) or Sunday midnight (Weekly). Tapping a thumb in Slideshow shows that photo now and the rotation goes on from it; changing the mode or the interval keeps the photo on screen. A new photo fades in over the old one; switching to Season color fades the photo out. Photo mode with no photo picked shows the oldest upload. |

### 8.8 Ambient (quiet hours) — `AMB`
Full-screen button (no bar), text on-deep.

| ID | Requirement |
|---|---|
| AMB-01 | Top row: season icon + "{Season} · {Month}"; right: offline notice (if offline) and the screen label "Glance". |
| AMB-02 | Giant Clock (clamp 84–300 px). |
| AMB-03 | Bottom grid (hairline 20% white top): current weather "{temp}° · {condition}" / "Low {low}° overnight · {next notable day}". Next notable day (decided): the first of the next 6 days with precip ≥ 50% → "{Wkd} {p}% rain" (e.g. "Sat 80% rain"). None → "Low {low}° overnight" alone. Next to it, "Next event": "Tomorrow" or "{Wkd}, {Mon} {d}" · {start} · {title}, {where} — or "Nothing scheduled". An all-day event reads "All day" in place of {start} and comes before that day's timed events. |
| AMB-04 | Caption "Click or tap anywhere to wake". Tap anywhere → Today (or the signed-out form, AMB-07). The whole screen is one button with `aria-label` "Wake screen". |
| AMB-05 | Enters automatically at the dim time of the night's set (SET-10: every night, or Sun – Thu / Fri & Sat by the day the night belongs to, with the noon cutoff) and leaves at its wake time (to Today, or to the signed-out form after SIGNIN-13, only if the Ambient screen is showing; a view someone woke into stays). Never when the schedule is Off or the night's set is "Not set". After a wake tap during hours, it returns after the idle timeout. A screen that starts during hours reaches Ambient the same way, after the idle timeout. |
| AMB-06 | Background: season deep, or the background photo (Photo or Slideshow mode) with dim ≥ 0.55 (A11Y-05). The season video (AMB-09) covers both when it plays. |
| AMB-07 | **Signed out by the server** (SIGNIN-13) during Ambient: Ambient stays, with "Signed out · tap to sign in" in the top row (the OFF-05 style). The clock and the saved weather keep showing. The next wake tap, or the end of ambient hours, opens the signed-out form instead of Today. A screen signed out by day whose idle timeout lands in ambient hours comes here too (SIGNIN-13). |
| AMB-08 | **Manual entry** (handoff v5): the Ambient (moon) button in the bar (SHELL-01) or "Preview" on the Ambient screen page (SET-10) opens Ambient at once, outside the schedule too. A tap wakes it to Today as usual. The idle timer and the schedule are unchanged. |
| AMB-09 | **Season video** (handoff v5): a muted, looping video for the current season (`videos/{season}.mp4`) fills the screen behind the clock under a 70% season-deep tint (raised from 60% so white text stays readable on bright frames). It covers the photo background too. A missing or failing file shows the AMB-06 background, with no label. Decorative: hidden from assistive tech. The video files aren't in the handoff (execution plan D04) [Open]. |
| — | Burn-in drift and screen dimming are recommended, not designed **[Open]**. |

### 8.9 Sheets (shared) — `SHEET`
- Modal over a 60% scrim that also covers the bar. Card radius 32, max-width 560, padding `clamp(24px,3vw,40px)`, shadow-3. Close IconButton 56 (v5, was 44).
- Closing an **unchanged** sheet (scrim, Cancel, ✕ or Escape on a hardware keyboard) closes it at once.
- **Discard changes?** (handoff v5, replaces "no dirty-check"): when the draft differs from what the sheet opened with, Cancel, ✕, a scrim tap or Escape replaces the footer in place with "Discard changes?", a line naming what's lost ("This event won’t be added." · "Your edits to this event won’t be saved." · "This note won’t be posted." · "Your edits to this photo won’t be saved."), a secondary "Keep editing" and a red `danger` "Discard". While it shows, scrim taps are ignored and ✕ confirms the discard. Any edit to a field brings the normal footer back. It closes any open time picker. The idle timeout (IDLE-01) still discards without asking. Escape is not in the design and follows Cancel. Fixture `discard=1` (board frames Calendar M, Notes C).
- The action row is sticky at the bottom: Delete on the left, Cancel + primary on the right.
- Offline: banner "You're offline" — event: "Changes save on this screen and sync when the connection is back."; note: "The note saves on this screen and posts when the connection is back."
- Focus is trapped while open. Opening moves focus to the sheet itself, not a field, so tablets don't raise the keyboard; closing returns it to what opened the sheet. Focus order inside sheets follows the visual order (A11Y-04).

---

## 9. Cross-cutting behavior

### 9.1 Time & clock — `TIME`
- TIME-02: The clock ticks every second. Event status recomputes every minute. Season Auto re-checks at midnight.
- TIME-03: A single `now` source (injectable for tests and the `?now=` fixture).
- "Local" time everywhere in this spec (today, midnight, the clock, event times, hourly boundaries) means the screen's time zone (LOC-06), not the device clock's zone.

### 9.2 Idle timeout — `IDLE`
- IDLE-01: After no touch for the chosen time, any view returns to Today and open sheets are discarded (without "Discard changes?", §8.9). Full-screen Photos closes too (PHOTO-14). Today opens with the bar hidden (SHELL-06). A tap, key press or scroll counts as a touch. Already on Today, only the sheet closes.
- IDLE-02: Paused while a text field is focused. Leaving the field starts the wait again.
- IDLE-03: During ambient hours, after a wake tap, idle returns to Ambient instead.

### 9.3 Loading — `LOAD`
- LOAD-01: Each source (calendar, weather, notes, photos) loads on its own. Zones fill in as they arrive. Clock and season are local and never wait.
- LOAD-02: Skeletons keep the final shape (no layout shift) and pulse 1.2 s. Shown only on first load with no saved data. Later refreshes swap in silently.
- LOAD-03: Over 10 s → that zone shows its failure state. The 10 s count starts when the screen opens (weather: when its fetch starts). Before the first sync the weather location isn't known yet, so the weather zone loads instead of asking for one (WX-04).
- Sources read saved data on the screen. "Loading" means nothing is saved yet and the first sync hasn't finished. "Failure" means that first sync, or the weather fetch, failed. Once data is saved, a failed sync only adds "Updated {time}" (FAIL-02). See [tech design](tech-design.md) §4.4.

### 9.4 Source failure (online) — `FAIL`
- FAIL-01: Only the failing zone changes: icon, "{Source} unavailable", retry countdown, "Try again". Weather reads "The forecast service isn’t responding. Trying again in {n} min." (WX-05); calendar, notes and photos read "The Glance server isn’t responding. Trying again in {n} min." (not drawn). "Try again" retries at once. On a calendar failure the Today hero shows only the clock and Picture of the day hides. Ambient has no buttons (the whole screen wakes it), so its failed zones stay blank while the retries run.
- FAIL-02: If saved data exists, keep showing it and mark the zone "Updated {time}".
- FAIL-03: Auto-retry at 1, 2 and 5 min, then every 5 min.

### 9.5 Offline — `OFF`
- OFF-01: Black pill, fixed bottom-left above the bar (v5: 12 px above it without labels, 24 px with labels, 84 px from the bottom on phone): wifi-off "Offline · showing saved data" + "Saved {time}" (time hidden on narrow and phone, and on Weather). Appears after **30 s** offline to avoid flicker. Leaves on reconnect.
- OFF-02: Saved data stays visible. Event statuses keep updating from the local clock.
- OFF-03: While offline, weather older than 1 hour → "Forecast from {time}" banner (WX-03) in place of the rain banner. Within the hour the forecast shows as usual.
- OFF-04: Edits queue locally. The sheet shows an offline banner, save reads "Save for later", and new notes show "Waiting to post" in place of their stamp until synced. An edit to a note that was already posted keeps its stamp.
- OFF-05: Ambient shows the same message in its top row (white 16 px mono).
- OFF-06: **Cold start offline.** A signed-in screen that reloads or restarts while offline opens Today from saved data, and every view works. Photos already synced to the account (background, slideshow, picture of the day) show even if this screen never displayed them.
- OFF-07: **Updates** to the app apply only while the screen is idle (Ambient, or Today after the idle timeout) and nothing is waiting to sync. The screen reloads itself once. Exception: if the server no longer accepts this version, the update applies at the next idle even with changes waiting. They're kept and sent by the new version.

### 9.6 On-screen keyboard — `KB`
- KB-01: Use the OS keyboard. Build on `visualViewport` resize (or `interactive-widget=resizes-content`), not fixed heights.
- KB-02: Sheets shrink to the space above the keyboard (280 ms), re-center, and scroll inside. The action row stays sticky.
- KB-03: Full-page forms (Sign in email, First sign-in name, First sign-in location, Weather setup, the Settings › Location setup card) pad the page by the keyboard height and scroll the focused field into view, 24 px below the top of the scroll area. Rows size to content, so the page scrolls instead of squeezing the hero.
- KB-04: Return in single-line fields moves to the next field. In Message it adds a line. In the last single-line field, Return submits a full-page form (Sign in email, First sign-in name, First sign-in location, Weather setup, the Settings › Location setup card) and hides the keyboard in a sheet (sheets never save on Return).
- The drawn keyboard in the prototype (`kb=1`) is a visual mock only. Do not build it. In the app, `kb=1` applies the prototype's keyboard height (36% of the window height, 260–380 px) as the inset and focuses the first field of the open sheet or form, caret at the end, so the frames can be checked without a device. The space the keyboard would cover stays empty.

### 9.7 Sync — `SYNC`
- SYNC-01: Settings, notes, events, photos and background are saved to the **account** in SQLite and sync to every display signed in to that account (the prototype persists nothing).
- SYNC-02: Transport (decided, [tech design](tech-design.md) §5). **Push:** each write is saved in IndexedDB together with an outbox entry. The sync engine sends outbox entries in order as idempotent `PUT`/`DELETE /api/{entity}/{id}`. **Pull:** `GET /api/sync?since={version}` returns every changed row, deletions included, plus the new cursor. `GET /api/sync/stream` (SSE) only signals that the account changed, which triggers a pull. Without SSE the client polls every 30 s. A pull never overwrites a row that still has a pending outbox entry.
- SYNC-03: Conflicts: last write **to reach the server** wins. The server stamps `updated_at` and `version`, so display clock drift doesn't matter. Offline edits (OFF-04) replay in order on reconnect. **Delete wins:** an edit to an event or note that another screen deleted doesn't bring it back. Settings are one record: if two screens change settings at the same moment, the later one replaces the whole set (accepted for v1).

### 9.8 Accessibility — `A11Y`
| ID | Requirement |
|---|---|
| A11Y-01 | Every control has a name: IconButtons use `aria-label`; an icon that carries meaning with no text beside it is an image named by it (the hourly and 7-day weather icons are named by their condition, "Rain", "Partly cloudy"). Decorative icons are hidden. |
| A11Y-02 | Choices show their state with `aria-pressed`: swatches (named by color), PillTabs, MonthGrid days, TimePicker cells, background and photo thumbs, and an IconButton with `active`. PillTabs are a group of buttons named by their label, not tabs, since they switch a value rather than a panel. |
| A11Y-03 | Sheets use `role="dialog"` with `aria-modal`, labelled by their title. Touch targets ≥ 44 px (56 on the kiosk bar); the sheet close and the upload Try again / Remove buttons are 56 px IconButtons (v5). |
| A11Y-04 | Focus order in sheets follows the visual order: ✕ (in the header) → the fields top to bottom, title field first → the color swatches → the actions (Delete, Cancel, primary). Tab wraps from the last action to ✕ and Shift+Tab back. Opening focuses the sheet itself (§8.9), so the first Tab lands on ✕. |
| A11Y-05 | Text hierarchy comes from weight, not opacity (DS rule): all text is black (or white on deep), never grey or dimmed (v5). Text reads at WCAG AA (4.5:1) everywhere: black on every season block and soft surface and on the white panels over photos, white on deep and on Winter's cobalt accent, **black on the Spring, Summer and Fall accents** (white on magenta, tangerine and ember is 3.3, 2.8 and 4.1:1), and white over the Ambient photo, dimmed at least 0.55 (4.8:1 over a white photo). |

### 9.9 Location and time zone — `LOC`
The location sets both the weather and the screen's time zone. It is one place per account, in the United States, and every screen of the account uses it. The clock, Today, the calendar, event times, the hourly forecast and Ambient all follow it. The same setup card appears in three places: Weather setup (WX-04), Settings › Location (SET-09) and the first sign-in (SIGNIN-14). Designed in handoff v4 ("Location and time zone" in the behavior notes; Weather, Settings and Account boards).

| ID | Requirement |
|---|---|
| LOC-01 | **Use my location:** a secondary action (locate icon) next to the setup card's primary (WX-04, SET-09, SIGNIN-14), shown only when the device can locate itself: the browser offers geolocation on a secure page and its permission isn't already blocked. Otherwise the card is exactly as before. The place found is saved at once, like a single search match (WX-09): the forecast loads on Weather, Settings returns to Settings (or asks LOC-09), sign-in goes to Signed in. |
| LOC-02 | **Locating** (timing rule): the tap replaces the button row at once with "Finding where this screen is…" · "If the browser asks, choose Allow." and a slow-pulsing locate icon, announced as a status. The browser's permission question is not timed. Once allowed, the position has 10 s (low accuracy; a reading up to 10 minutes old is fine), then the place lookup has 5 s; past either limit → the matching failure. The field stays editable: typing cancels locating (a late answer is dropped, as WX-07) and brings the buttons back. Leaving the page or "Skip for now" also cancels. |
| LOC-03 | **Failures** return to the card with the draft kept, as a soft row under the field with an icon (not a red field error, since the field wasn't at fault), cleared on the next keystroke. Only the card changes; the rest of the screen and the saved location stay. Permission denied (map-pin-off): "Location is off for this screen. Type a city or ZIP instead.", and Use my location hides from then on (the browser won't ask again). No position or timed out (locate-off): "Couldn’t find where this screen is. Try again, or type a city or ZIP." Outside the United States (globe): "This screen seems to be outside the US. Glance works for US places only. Type a US city or ZIP." Lookup failed (search-x): "Couldn’t look up this place. Try again, or type a city or ZIP." It is also the failure when the Glance server can't be reached (offline). "Try again" means tapping Use my location again. |
| LOC-04 | **Place from a position:** the server turns the coordinates into a place (city or nearest named area, state) and its time zone. Coordinates are rounded to 2 decimals (about 1 km) before they are looked up or saved. A position with no US state is "outside" (LOC-03). |
| LOC-05 | Every saved place carries its IANA time zone, from search (WX-09) or from LOC-04. A search result the geocoder gives no valid zone for is left out of the matches. A place saved before v0.32 has none until it is picked again. |
| LOC-06 | **Screen time zone:** every time and date on screen (clock, today, midnight, Season Auto, event times and days, the calendar, note stamps, the slideshow boundaries, ambient hours, "Updated {time}") uses the location's time zone, else the device's. A screen whose own clock is set to another zone still shows the location's time. Changing the location changes the time zone on every screen at the next sync. Daylight saving: a wall time skipped by the change (2:30 AM in spring) moves forward by the gap (3:30 AM), and a repeated one (1:30 AM in fall) is the first of the two. |
| LOC-07 | **Server time zone:** server rules that need a local day (the upload date of a photo with no EXIF date, PHOTO-03) use the location's time zone, else `accounts.time_zone` (the first browser's zone, SIGNIN-12). |
| LOC-08 | **Time zone names**, the way families say them: always "{Name} time": Eastern time, Central time, Mountain time, Arizona time (most of Arizona, no clock change), Pacific time, Alaska time, Hawaii time; territories: Atlantic time (Puerto Rico, US Virgin Islands), Chamorro time (Guam, Northern Mariana Islands), Samoa time. No abbreviations (PT, PDT), offsets, "standard"/"daylight" or zone IDs; the name doesn't change twice a year. Shown only in the Settings row summary, the Location page, the LOC-09 confirm and the WX-09 match rows; the clock itself carries no zone label. |
| LOC-09 | **Time zone change confirm** (decided in handoff v4): only in Settings › Location, only when a place is already set with a zone and the new place's time zone name (LOC-08) differs. The card is replaced in place by a highlight block: eyebrow "Time zone change", title "Switch to {new} time?", body "{place} is in {new} time. The clock moves {n} hours {ahead\|back}, and event times change to match on every screen." ("1 hour" for one) Two tiles "Now · {old} time {clock}" and "After · {new} time {clock}", plus one example from the next upcoming event: "{title} at {time} will show at {new time}." (no upcoming event → no example). When the two zones read the same time today but differ later in the year (Arizona vs Pacific in October), the body is "The time is the same right now, but it can differ later in the year." Primary "Switch to {new} time" saves and returns to Settings; the clock jumps at once (no animation). Secondary "Keep {old} time" goes back to the card with the draft kept. Not asked when the first place is set (WX-04, SIGNIN-14). Events keep their moment and show at the new local time. Fixture `wx=tz` (Portland, OR → Portland, ME: 3 hours ahead, "Lunch with Aunt Rosa at 12:00 PM will show at 3:00 PM.", the first event after 10:41 AM; the prototype hard-codes Soccer practice). |

---

## 10. Copy deck
All user-facing strings live in one module (`src/copy.ts`) so they can be reviewed and translated later. The copy is the prototype's, re-copied for families in handoff v2 (prompt 2); strings for states the prototype doesn't draw are in §8.

New in handoff v4 (v0.33): the signed-out form (SIGNIN-13, AMB-07), "Use my location" and its locating and failure copy (LOC-01..03), the Location row and page (SET-09), the time zone confirm (LOC-09), the first-run location step with "Skip for now" (SIGNIN-14), the Ambient screen page (SET-10), and "Continue as guests" (was "Continue as demo"). Time zones are named the family way ("Pacific time", LOC-08), never by zone ID or UTC offset.

New in handoff v5 (v0.38): nav labels (SHELL-01), "Show menu" (SHELL-07), "Hide bar when idle" (SET-11), "See all {n} events" (TODAY-11), "ALL DAY" and "Set times · All day" (EVT-08), "Discard changes?" and its lines (§8.9), "On this day · {year}" (TODAY-07), Photo details and its source captions, the guessed-value hints and "Delete photo" (PHOTO-10..13), full-screen Photos (PHOTO-14), the signed-in screens list (SET-12), "Scan to sign in" (SIGNIN-15), "Sign out this device only." (SET-08, was "Signs out this screen only."), "Couldn’t send. Try again." (SIGNIN-03, now drawn). "Continue as guests" is gone (SIGNIN-05).

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
| **6. Location and time zone** | Screen time zone from the location (LOC-05..07), "Use my location" (LOC-01..04), Settings › Location (SET-09), first-run location step (SIGNIN-14), time zone names and confirm (LOC-08/09). UI from handoff v4 | A screen whose clock is set to UTC shows the location's time everywhere. The new states match the v4 Weather, Settings and Account boards at the 6 sizes |
| **7. Handoff v4 follow-ups** | Signed-out form (SIGNIN-13, AMB-07), editable ambient schedule (§7 `ambient`, SET-06, SET-10, AMB-05) | A 401 with a sheet open waits for the sheet; the form keeps the waiting changes. The Ambient screen page matches the Settings board frames N–R; schedule rules have table tests (weekend nights, past midnight, "Not set") |
| **9. Handoff v5** (execution plan Phase 9; phase 8 there moves the server to PostgreSQL) | Look and nav bar (§2, §4.3, SHELL-01/02/06/07, SET-11, AMB-08), Discard changes? (§8.9), all-day events (EVT-08, TODAY-12, CAL-06), Today overflow (TODAY-11), picture of the day (TODAY-07), photo details, delete and full screen (PHOTO-10..14), signed-in screens and QR sign-in (SET-12, SIGNIN-15), sign-in changes (SIGNIN-01/03/05), Ambient season video (AMB-09) | Every new frame of the v5 Today, Calendar, Notes, Photos and Account boards matches at the 6 sizes; all-day events stay on their date when the location's time zone changes; a photo edited or deleted on one screen changes on the others |

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
| 5 | "Continue as guests" (was "Continue as demo") | ~~Dev/demo builds only~~ **Removed** in handoff v5 (SIGNIN-05) |
| 6 | Picture of the day | ~~Deterministic daily rotation by local date~~ Handoff v5: "On this day" first, else a shuffled cycle, the same on every screen (TODAY-07) |
| 7 | Weather | Refresh every 15 min. Rain banner when precip ≥ 50% in the next 8 h. Provider still open (below) |
| 8 | Past-day events | Struck through (past) |
| 9 | Overflow (events, notes) | Notes: scroll inside the zone. Events on Today: "See all {n} events" (handoff v5, TODAY-11) |
| 10 | Sync | SSE with polling fallback, last write wins (§9.7) |
| 11 | Undesigned states | **Designed in handoff v3** (prompt 3): sign-up/sign-in flow (§8.1), upload progress/failure/offline (PHOTO-06..09), location search (WX-07..09) |
| 12 | Account model | **One account per family, one email, no members.** Magic link for sign-up and sign-in. First sign-in asks for the person's name. Events, notes, photos and settings are per account |
| 13 | Screen label | **"Glance"** on Ambient (AMB-01) and the sign-in wordmark; handoff v5 removed it from the Today hero (TODAY-01). No family or screen name is stored (but see SET-12, §12.2) |

| 14 | Runtime | One Node server process with a persistent disk (§3, tech design D17) |
| 15 | Weather provider | Open-Meteo (forecast + geocoding), behind a `WeatherProvider` adapter |
| 16 | Time zone | **The location's IANA zone** (`weatherLocation.timeZone`) for the screens and server jobs (LOC-06/07). Before a location is set: the device's zone on screen, and on the server the zone stored on `accounts` from the first display's browser (v0.32) |
| 17 | Query layer | Raw SQL with small typed helpers, no ORM. Runtime validation with Valibot |
| 18 | Magic-link email | [Resend](https://resend.com) HTTP API, configured by env vars (v0.37) |
| 19 | Client data and sync | Local-first IndexedDB store with an outbox. Server-stamped versions, last write to reach the server wins (§9.7) |
| 20 | Place from a position | US Census Geocoder (place and state) + Open-Meteo (time zone), keyless, called by the server (LOC-04, v0.32) |
| 21 | Designs for prompts 4 and 5 | **Handoff v4** (2026-10-12): the signed-out form waits for open edits and keeps waiting changes (SIGNIN-13); a time zone change in Settings asks first (LOC-09); "Set location" on Today stays on Weather (TODAY-08) |
| 22 | Ambient hours | **Editable** (handoff v4, SET-10): Every night · Weekends differ (Sun – Thu / Fri & Sat) · Off, in 15-minute steps. Replaces the fixed 6:00 PM – 7:30 AM of v1 |
| 23 | Design handoff v5 (2026-10-15) | The designer's own revisions, no prompt: all-day events, photo details and delete, a bar that hides when idle, Discard changes?, signed-in screens and QR sign-in, and the look changes listed in the status line (v0.38). Built in execution plan Phase 9 |

The full technical decision list (D1–D23) is in [`tech-design.md`](tech-design.md).

### 12.2 Still open
No technical items are open. The remaining **[Open]** markers are product and design questions: note character limit (§7) and burn-in protection (§8.8), plus these from handoff v5:

| # | Question | Blocks |
|---|---|---|
| O1 | **Screen names and types** (SET-12). The list shows "Kitchen screen", "Living room tablet", but no step names a screen and v1 stores no name (decision 13). Options: a name asked for at sign-in, a generic name from the device type ("Screen", "Tablet", "Phone") plus the browser, or a rename action (out of scope in v1). The type could be read from the browser at sign-in | Execution plan U13 |
| O2 | **Who may use the QR code** (SIGNIN-15). Anyone who can see the screen can scan it and sign a device in to the family account, with no email check. Options: accept it (the screen is in the family's home, like the notes), or ask for confirmation on the screen when a device scans | U14 |
| O3 | **Deleting the background photo** (PHOTO-13). The design doesn't say what replaces it. Proposed: Photo mode falls back to the oldest upload (as BG-06 already does with no photo picked), Slideshow goes on from the next photo, and with no photos left the background returns to Season color | U11 |
| O4 | **Season videos** (AMB-09). The four `videos/{season}.mp4` files aren't in the handoff; they need a source, a license and a size budget (they are large for an offline kiosk cache) | U16 (ships without them: AMB-06 background) |

## Appendix A — Fixture data
Family fixtures for Phases 1–4, **identical to the handoff v3 mock data** (v4 adds the states below), so screens can be compared pixel for pixel with the frames. Frozen now: **Fri Oct 9 2026, 10:41 AM Pacific** (Ambient 7:12 PM). Fixture times are Pacific wall times (`America/Los_Angeles`, the fixture place's zone), and a `now=` without an offset is read in that zone, so the frames match in any device zone (LOC-06). Account: maria@example.com (the known account), name "Maria". Any other email is a new account. Screen label "Glance". Upload fixtures (`upload=error`): "IMG_3307" too large, "Recipe card" not a photo, "Halloween costumes" network failure. Place search fixtures: "Portland" → Portland, OR / Portland, ME; "Springfield" → IL / MO / MA. The mock accepts any 5-digit ZIP or any query containing a comma, and treats anything else it doesn't know as unknown (`wx=unknown` uses "Pordland"). Weather location "Portland, OR" with `America/Los_Angeles` ("Portland, OR · Pacific time"). Place search fixtures carry their zones: Portland, OR Pacific; Portland, ME Eastern; Springfield, IL and MO Central; Springfield, MA Eastern. The ZIP or comma fallback place gets the fixture zone, so it never asks LOC-09. **Handoff v4 states:** the v4 prototype names zones by a small state → zone table ("Portland, OR · Pacific time", Portland, ME is Eastern, 3 hours ahead) and treats "Use my location" as always finding Portland, OR after 2.6 s. Its `geo=denied\|unavailable\|outside\|lookup` failures are the app's `wx=denied\|no-position\|outside\|lookup`; `geo=none` (no button) has no fixture, since the button hides by itself when the browser can't locate. The signed-out fixture uses maria@example.com as the last email; `pending={n}` sets the waiting changes. Ambient schedule fixtures use the SET-10 defaults.

**Events (Oct 2026):** 9th — School drop-off 9:00–9:30 AM Lincoln Elementary (soft) · Grandma's video call 10:30–11:15 AM Living room (1, *now*) · Lunch with Aunt Rosa 12:00–1:00 PM Café Lumen (2) · Dentist — Leo 2:00–2:20 PM Dr. Patel (accent) · Soccer practice 3:30–4:30 PM Laurelhurst Park (3). 2nd — Movie night 7:00–9:00 PM Living room (2). 14th — Parent-teacher conference 4:00–4:30 PM Lincoln Elementary (4). 22nd — Leo's birthday party 4:00–6:00 PM Home (3). 28th — Pumpkin carving 5:00–6:30 PM Back porch (1).

**Notes:** "Wi-Fi password is on the fridge!" Dad 8:12 AM (1, −2°) · "Package for Mia at the front door." Mom 9:05 AM (2, 1.5°) · "Window cleaner comes Wednesday — please leave blinds up." Mom Mon (3, −1°) · "Welcome home, Grandpa!" Mia Tue (4, 2.5°) · "Bike lock code changes Friday. Ask Dad." Dad Tue (soft, −1.5°).

**Weather (°F):** unchanged from the prototype. Now 64 Partly cloudy, H 68 / L 51, feels 62, wind 8 mph NW, humidity 62%, UV 3, sunset 6:42 PM. Hourly 11 AM–6 PM: 64, 66, 67, 68, 65, 61, 58, 56. Daily: Today 68/51 20% · Sat 59/48 80% · Sun 61/47 30% · Mon 66/49 · Tue 69/50 · Wed 65/50 10% · Thu 58/46 70%. Ambient: 56° Light rain.

**Photos:** Apple picking (Sep 27, Sauvie Island) · Pumpkin patch (Oct 4, Family outing) · Cannon Beach (Sep 6, Summer trip — default background and picture of the day) · First day of school (Sep 2, Lincoln Elementary) · Bike ride (Aug 30, Waterfront) · Forest Park trail (Aug 22, Weekend hike). Upload order (oldest first): Forest Park trail, Bike ride, First day of school, Pumpkin patch, Apple picking, Cannon Beach, so the TODAY-07 rotation picks Cannon Beach on Oct 9. Use bundled fixture images (not picsum.photos) so the app works offline. New-note draft in the keyboard frame: "Has anyone seen my blue umbr".

**Handoff v5 fixtures.** All-day events: 16th — No school · teacher planning day, Lincoln Elementary (4), always present; with `allday=1` also 9th — Grandpa staying over, Guest room (2). `events=many` adds four events on the 9th: Grocery pickup 5:00–5:30 PM Fred Meyer (4) · Family dinner 6:00–7:00 PM Home (1) · Piano practice — Mia 7:30–8:00 PM Living room (2) · Bedtime story 8:30–9:00 PM Kids’ room (soft), 9 events in all. Uploaded photos (`upload=done`, `sheet=photo|photometa`): `halloween-costumes-2025-10-31.jpg` → Halloween costumes, Oct 31 2025, no place (name from the file name, date from the file name, place not in photo); `IMG_4410.JPG` → Cannon Beach, Aug 16 2026, Cannon Beach, OR (name from the place, date from the photo, place from the photo location). The Appendix A photos are `checked` with sources "photo" and "photo-location", so they show no hint. Picture of the day: no fixture photo was taken on Oct 9, so the cycle decides, and the fixture seed keeps Cannon Beach on Oct 9 (tech design §4.7). Signed-in screens (SET-12): Kitchen screen (monitor, This screen) · Hallway screen (monitor, Active 12 min ago) · Living room tablet (tablet, Active yesterday) · Maria’s phone (smartphone, Active Oct 2): "4 screens signed in".
