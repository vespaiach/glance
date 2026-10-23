# Glance — Product Specification

| | |
|---|---|
| Status | v0.82 |
| Date | 2026-10-23 |
| Technical design | [`tech-design.md`](tech-design.md) |
| Source of truth | [`Glance.dc.html`](design/handoff/Glance.dc.html) (prototype) · [`Glance Notes.dc.html`](design/handoff/Glance%20Notes.dc.html) (behavior) · [`Glance States.dc.html`](design/handoff/Glance%20States.dc.html) and the side pages (§2) |

Requirement IDs (`TODAY-03`, `NOTE-05` …) are cited in tasks, PRs and tests. All copy is exact; `{braces}` are interpolated.

---

## 1. Product overview

**Glance** is a responsive web app that works as a **family wall calendar**: a shared calendar, weather, notice board and photo frame for one household. It runs on wall or stand-mounted touch screens (1920×1080), laptops, tablets (1024×768, iPad portrait 820) and phones (390).

- **Primary user:** any family member at the screen, kids included. Reads it from across the room, taps for details, adds a note or event. Never signs in at the screen.
- **Account holder** (usually a parent): owns the family's one account (one email), signs screens in, manages settings, uploads photos.
- **Voice:** "a calm family noticeboard". Warm but brief, sentence case, readable from 2 m, words a child can read. Never "I"; "you" only in instructions.

### 1.1 Goals
1. Anyone in the room sees what's happening now and next, today's weather and family notes at a glance.
2. Anyone at the screen can add or edit events and notes without signing in.
3. The screen stays useful offline, when a source fails, and during quiet hours (Ambient).

### 1.2 Out of scope
Calendar sync (Google/Outlook) · recurring and multi-day events · removing, renaming or recoloring tags · note moderation · photo albums · weather alerts, forecast-day detail · places outside the US, more than one location per account, per-screen locations · guided setup, renaming or remotely signing out screens · roles and permissions · changing the account name or email, deleting the account · session expiry, kiosk lock.

### 1.3 Open questions
None.

---

## 2. Sources and overrides

The **prototype** (`Glance.dc.html`) wins on layout, copy, states and component use, and **`Glance Notes.dc.html`** on behavior. Glance Notes wins over the handoff README and the side pages, then comes the design-system readme. The side pages: `Glance States` (states and variants by feature at the three sizes; its frame letters are stable references), `Glance Phone Calendar & Events` (small Calendar and the person filter), `Glance Today Layout`, `Glance Today Hero`, `Glance Today Event`, `Glance Today Notes`, `Glance Today Picture`, `Glance Calendar Layout`, `Glance Photos Layout`, `Glance Ambient Layout` and `Glance Notice Board`. Only the prototype's defaults are built: the left sidebar with the Rail handle (no bottom bar), Today's Now panel layout, Calendar's day timeline (option 1c), the avatar-stack person filter (1c on small, 1d on large) and the notes' "{n} more notes" row (1b). The sidebar is checked against the prototype; everything else against `Glance States` and the screen's side page at large 1920×1080, normal 1024×768 and small 390×844.

**Settled conflicts:**
- Small ends at 768 px (Glance Notes), not the README's 820.
- Normal Today uses the prototype's two columns (TODAY-14).
- Past plans are never struck through, in Today's Earlier fold too (TL-05).
- The open-day ribbon runs 5 AM – 9 PM, the timeline's span, not 6 AM – 10 PM (TODAY-13).
- Today’s photo frame cap follows the prototype code: `25dvh − 24px` on large, none on normal and small (TODAY-07).
- The "Add from your phone" QR code shows on Today on large only, and on Photos on large and normal (TODAY-07, PHOTO-03).

Where Glance departs from the design system:

| Topic | Glance does |
|---|---|
| Navigation | Left sidebar (SHELL-08), no bottom bar, no Ticker |
| Canvas | Light grey `--hairline-soft` canvas behind white panels, so one layout works on season color and on a photo |
| Backgrounds | Season color, Photo or Slideshow, with dim. Text zones sit on white panels |
| Brand | "Glance", plain Geist 540, no logo |
| Type | Smaller fluid `clamp()` sizes (§4.3). Mono captions 14 px minimum (16 on Ambient). All text black or white, never grey |
| Spacing | 8 px scale only: 4, 8, 12, 16, 24, 32, 48, 96 |
| 12-hour times | Plan cards omit AM/PM; Now panel, forecast, sunset and Ambient include it |
| People | Tags (people) with fixed colors (§7) mark events; the season palette never colors a person |
| Notes | One paper tone, the season soft color; notes have no color of their own |

---

## 3. Technical baseline

Next.js (App Router) as a single-page app, TypeScript strict, Biome, StyleX, Valibot, PostgreSQL, a local-first IndexedDB store with a sync engine. Details in [tech design](tech-design.md) §1.

- After the first load, view changes never reload the page, and the shell's timers (clock, idle, slideshow, sync) keep running. Every view is a real route, so deep links work.
- One Node server; photos on its persistent disk or in an S3 or R2 bucket; PostgreSQL runs outside it.
- The app is an **installable PWA** that cold-starts offline (OFF-06). It needs HTTPS. On iPad kiosks, install it to the home screen so saved data isn't evicted.
- Icons: Lucide 0.460.0, stroke 1.75 (1.25–1.5 at ≥ 48 px). Fonts: Geist and Geist Mono variable 100–900, self-hosted.

---

## 4. Design system

### 4.1 Tokens and seasons
The handoff tokens are ported verbatim as StyleX vars. Season roles: **block-1 = Now panel, block-3 = weather, block-4 = highlight**, soft = warm neutral and the notes' paper, deep = Ambient, accent = alerts (at most one accent action per screen). A season change cross-fades 600 ms.

| Season | 1 | 2 | 3 | 4 | soft | deep | accent | Icon |
|---|---|---|---|---|---|---|---|---|
| Spring | Lime | Pink | Mint | Lilac | Cream | Navy | Magenta | `flower-2` |
| Summer | Sun | Coral | Sky | Lime | Cream | Sea | Tangerine | `sun` |
| Fall | Amber | Rust | Sage | Coral | Cream | Bark | Ember | `leaf` |
| Winter | Ice | Lilac | Glacier | Mint | Frost | Midnight | Cobalt | `snowflake` |

### 4.2 Components
Typed components in `src/ui` (the calendar controls in `features/calendar/components`), styled with StyleX only; most take an optional `xstyle`. Words come in as props.

| Component | Notes |
|---|---|
| `Clock` | Tabular numerals, date line "Friday, October 9". The colon blinks every 0.6 s, and stays on with reduced motion. Takes the time from the screen; no timer of its own |
| `DayTimeline` | The elastic day timeline (§8.3.2): hour gutter with hour weather, plan cards, long-plan strips, the "+N MORE" tile, free slots, now marker, rain chips (Calendar) |
| `WeekStrip`, `CalendarHeader`, `DayList`, `DatePicker` (calendar feature) | CAL-01, CAL-02, CAL-10, CAL-03. Day buttons named by the full date; selected = black circle (`aria-pressed`), today = soft circle (`aria-current="date"`) |
| `WhoStack`, `WhoSheet` | CAL-05, TODAY-04: the person filter's avatar stack and its "Show plans for" modal |
| `MonthGrid` | The design system's month grid, in the small date picker only (CAL-03) |
| `PersonDot` | A tag's color dot (6–12 px). Plan cards build their dot rows and Who suggestions their pills from it |
| `Button` | Pill. Variants primary, secondary, ghost, accent, inverse, **danger** (`--danger`, white text, every season: delete and discard confirms) |
| `IconButton` | `md` 40, `touch` 56, `lg` 72 px; `active` = black; `current="page"` |
| `PillTabs` | Segmented control, a group of `aria-pressed` buttons. `lg` (56 px) wraps onto more rows |
| `Radio`, `Switch`, `Slider` | §8.7. Radio: 24 px black ring, 12 px dot when selected, label 18 px (540 selected, 330 not), 56 px tap height. Switch: 56×32 track, 24 px white knob; on = black track, knob right; off = soft track with hairline; 180 ms; `role="switch"`. Slider: 44 px tall, black, mono end labels; disabled = gray |
| `CodeField` | SIGNIN-04: six cells over one numeric input |
| `TextInput` | 2 px black focus ring, error below, optional mono caption right of the label, `type="date"` |
| `ColorBlock`, `Card`, `Banner`, `Eyebrow`, `Icon`, `TopBar` | As in the design system. Blocks are never shadowed. `TopBar` is in the gallery only |
| `WeatherNow`, `ForecastDay` | Values arrive in the display unit; no unit letter |
| `StickyNote`, `NoteComposer` | Radius 6, shadow-2, tilted, on the paper tone (§8.5); the composer is NOTE-02 |
| `TimeField`, `TimePicker` | §8.3.1 |
| `Skeleton`, `EmptyState`, `SourceFailure`, `Zone` | §9.3–9.4. `Zone` renders loading / empty / ready / failed in its own error boundary |
| `Sheet` | §8.9 |
| `ColorSwatchPicker` | 44 px round swatches named by color; selected = white + black ring. Tags use the 12 tag colors; notes have none |
| `OfflinePill`, `SettingsRow`, `AllDayTile` | OFF-01, §8.7, TODAY-12 |
| `BackLink`, `DiscardPrompt`, `PhotoBackdrop`, `QrCode` | §8.7 "‹ Settings" link, "Discard changes?" (§8.9), photo background (BG-*), SIGNIN-15 and "Add from your phone" QR (PHOTO-03) |

**DS-01:** `/dev/gallery` (dev and demo builds only) shows every component in all 4 seasons and every state `Glance States` shows, at the three sizes.

### 4.3 Fluid type and gutters
```css
--type-clock-size: clamp(84px, 6.8vw, 128px);   --type-clock-ls: -4px;
--type-temp-size:  clamp(76px, 6.4vw, 96px);    --type-temp-ls:  -3px;
--type-display-xl-size: clamp(36px, 3.6vw, 52px); --type-display-xl-ls: -1px;
--type-display-lg-size: clamp(28px, 2.6vw, 40px);
--type-headline-size: 20px; --type-headline-ls: -0.2px;
--type-body-lg-size: 18px; --type-body-size: 16px; --type-body-sm-size: 15px;
--type-button-size: 17px; --type-eyebrow-size: 14px; --type-caption-size: 14px;
--kiosk-gutter: clamp(20px, 2.6vw, 40px);
```
Ambient: `--type-clock-size: clamp(84px, 19vw, 300px); --type-clock-ls: -8px; --type-eyebrow-size: clamp(14px, 1.4vw, 20px)`. Today's type grows past 1920×1080 (TODAY-14).

### 4.4 Motion and feedback
- Touch first: no hover states. Press scales to 0.97 over 120 ms ease-out. Fills never darken. No bounces, no blur.
- Tab/tile state 180 ms · screen change 280 ms fade (to and from Ambient: AMB-10) · season and background cross-fade 600 ms · keyboard resize 280 ms.
- **Reduced motion:** every 280 ms and 600 ms change happens at once. Press, tab and tile feedback stay.

---

## 5. App shell and layout

### 5.1 Breakpoints (window width, live on resize)

| Name | Width | Behavior | Devices |
|---|---|---|---|
| `large` | > 1200 | Fits one screen, no page scroll | 1920×1080, 1440×900, 1280×800 |
| `normal` | 769–1200 | The large layout unless a requirement says otherwise (Today: TODAY-14) | 1024×768, 1180×820, iPad portrait 820 |
| `small` | ≤ 768 | One scrolling column, small-screen rules (§5.4) | 390×844, 768 px tablets |

The sidebar narrows the page but doesn't change the size. "Large" in a requirement covers normal too unless normal is named.

### 5.2 Shell
- Root `100vh`, season theme, background = season canvas or photo layer (BG-06). `<main>` scrolls, padding = gutter, 16 px at the bottom.
- **SHELL-01 Nav:** a left sidebar with seven items in a `nav` named "Main": **Today** `house`, **Calendar** `calendar-days`, **Weather** `cloud-sun`, **Notes** `sticky-note`, **Photos** `image`, then pinned to the bottom **Ambient** `moon` (named "Ambient screen") and **Settings** `settings`.
- **SHELL-02:** the active view is black with `aria-current="page"`. Settings stays active on its sub-pages. Ambient is never active: it opens the Ambient screen at once (AMB-08).
- **SHELL-03:** no sidebar on Sign in and Ambient; the page takes the full width.
- **SHELL-04:** changing view closes any open sheet and scrolls `main` to the top.
- **SHELL-05:** on a photo background every zone with text sits on a white panel (radius 24). Color blocks and the sidebar stay solid.
- **SHELL-08 Sidebar states:** Hidden → Rail → Expanded → Hidden, plus Rail → Hidden with the rail's ✕. A load on Today starts Hidden, on any other view Rail. Opening any view but Today brings the Rail back; going to Today leaves it as it is. On small there is no Rail: Hidden ⇄ Expanded only, and any view change returns to Hidden. The state belongs to this tab and isn't saved.
  - **Hidden:** the grip, a white tab flush with the left edge, 36×112 px (24×96 on small), 24 px radius on its inner side, level 1 + 2 shadow, a 22 px `chevron-right` (stroke 2), in a 44×144 touch area, 0.97 press: "Show sidebar" → Rail. Every view but Today keeps a 36 px left inset (24 on small) while Hidden, so the grip never covers content.
  - **Rail:** 80 px white, full height, hairline inner edge, 16 px padding, 8 px gap: the five views as 56 px IconButtons, a flexible gap, Ambient and Settings, then a 56 px ✕ "Hide sidebar" as a fixed footer (the items above scroll on short windows). Page inset 80 px. **Expand handle:** the same pill on the rail's inner edge, vertically centered, 56×96 touch area, "Expand menu" → Expanded. It fades out (180 ms) while the drawer is open and in full-screen Photos.
  - **Expanded:** a 320 px white panel 12 px from the top, bottom and left, radius 24, `shadow-1`, no scrim. Header "Glance" (Geist 540, 24 px). The five views as 64 px pill rows (icon + 20 px label, weight 480; current = black fill), a gap, a hairline, Ambient and Settings, then a fixed "Close" row (named "Close sidebar") → Hidden. The rail fades out (180 ms). The page is pushed 332 px and stays usable: a tap on it doesn't close the drawer. Picking a row, or any view change, returns to Rail.
  - **Small (≤ 768):** no Rail. The page takes the full width with only the grip (24×96, "Open menu") on the edge; it opens the Expanded drawer directly, and closing it (Close, scrim or picking a view) returns to the grip. Drawer 248 px with 48 px rows, 16 px labels, 20 px icons and a 20 px "Glance" header. The drawer slides **over** the page with a 60% scrim; a scrim tap closes it and focuses the grip.
  - **Motion:** slides over 280 ms `cubic-bezier(0.2, 0, 0, 1)`; at once with reduced motion.
  - Fixtures: `rail=1` (Rail), `rail=open` (Expanded).
- **SHELL-09 Keyboard and focus:** the grip and Expand menu carry `aria-expanded`. Escape in Expanded → Rail. Opening the drawer focuses the current view's row. Escape or a row → focus to Expand menu; Close or ✕ → the grip; the grip → Expand menu. A view change that brings the rail back, and a page load, move no focus. Parts not shown are `inert`. No focus trap.
- **SHELL-10 Offsets:** the sidebar inset (Hidden 0 on Today and 36 px elsewhere, Rail 80, Expanded 332; small 0 on Today and 24 px elsewhere, the drawer overlays the page) pads the shell, so the views and the offline pill follow it. Sheet scrims and full-screen Photos cover the sidebar.
- **SHELL-11 Hides when idle** (when `hideSidebarWhenIdle` is on, SET-05): after 15 s with no touch or key press, Rail or Expanded → Hidden (the drawer closes and the rail slides away). The timer doesn't run while a sheet is open, the keyboard is up or a text field is focused. Tapping the grip → Rail and restarts the 15 s. No focus moves. Off: the sidebar stays as it is.

### 5.3 Grid templates

| View | large and normal | small |
|---|---|---|
| Today | TODAY-14 | TODAY-14 |
| Calendar | week strip, then `1fr` (CAL-04) | header card, then the day list (CAL-02, CAL-10) |
| Weather | `minmax(340px,.85fr) 1.4fr` | 1 col |
| Photos | `1.6fr minmax(300px,1fr)`, featured min-h 200, thumbs 2 col, fits the screen | 1 col, featured 260, thumbs 2 col |
| Settings, Location, Ambient screen | `1.4fr minmax(320px,1fr)` | 1 col |
| Background | `1.4fr minmax(320px,1fr)`, thumbs `auto-fill minmax(160px,1fr)` | 1 col, thumbs 2 col |
| Sign in | `1fr 1fr` | 1 col |

### 5.4 Small (≤ 768)
- One column everywhere. Hourly `repeat(8, 64px)` and 7-day `repeat(7, 64px)` scroll sideways; the four weather details sit in a 2 × 2 grid (WX-01).
- Today: the compact Now panel with no Clock (TODAY-01), and the day list as the schedule (TODAY-11).
- Calendar: the header card and the day list (CAL-02, CAL-10); no timeline, 24 hours link or rain chips.
- Photos: Upload opens the file picker; no QR panel (PHOTO-03).
- The note composer opens full screen (NOTE-02); the event page moves its actions to a bottom bar and drops the day preview (EVT-01, EVT-13).
- No rail: the grip opens the drawer over the page (SHELL-08).

---

## 6. Routes and fixtures

| Route | View |
|---|---|
| `/signin` | Sign in |
| `/` → `/today` | Today |
| `/calendar` | Calendar (`?date=YYYY-MM-DD`) |
| `/weather` · `/notes` | Weather · Notes |
| `/photos` | Photos (`?photo={id}`, PHOTO-01) |
| `/settings` · `/settings/background` · `/settings/location` · `/settings/ambient` | Settings · Background · Location (SET-09) · Ambient screen (SET-10) |
| `/ambient` | Ambient |
| `/dev/gallery` | Component gallery (DS-01; dev and demo builds only) |

**Fixture params** (demo builds only) open any frame directly. They are frozen snapshots: the reducer's or seed's initial state, and timers run only after a tap. `now=ISO` freezes the clock (default Fri Oct 9 2026 10:41 AM Pacific).

| Area | Params |
|---|---|
| Shell, data | `clock=24`, `season=…`, `bg=photo`, `empty=1`, `net=loading\|offline\|wxerror`, `kb=1`, `rail=1\|open` |
| Sheets | `sheet=event\|newevent\|note\|newnote\|allday\|past\|photo\|photometa`, `details=1`, `time=start\|end\|error\|noend`, `discard=1` |
| Today, Calendar | `events=many\|none`, `allday=1`, `day={d}` (day of October 2026), `who={tag,…\|none}`, `whosheet=1`, `span=24`, `dp=open`, `potd={id}\|qr\|error`, `potdlong=1` |
| Photos, Background | `upload=one\|progress\|error\|offline\|done`, `full=1`, `chrome=0`, `phdel=1`, `phqr=1`, `play=0` |
| Weather setup | `wx=searching\|unknown\|choose\|locating\|no-position\|denied\|outside\|lookup\|tz\|savefail` |
| Settings, Ambient | `amb=same\|split\|off`, `pick=all.s\|all.e\|wknd.s\|wknd.e`, `qr=open\|failed`, `bright=full\|low` |
| Sign in | `signin=form\|sending\|sendfail\|sent\|checking\|wrong\|locked\|name\|location\|expired\|offline\|done\|ended`, `code={digits}`, `acct=returning`, `pending={n}`, `switch=1`, `backin={s}` (+ `hold=1`), `demo=1` |

---

## 7. Domain model

```ts
type Tone = 1 | 2 | 3 | 4 | 'soft' | 'accent';       // season swatch tones
type Season = 'spring' | 'summer' | 'fall' | 'winter';
type Synced<T> = T & { updatedAt: string; version: number; deletedAt?: string };  // stamped by the server

type TagColor = 'lilac' | 'sky' | 'coral' | 'mint' | 'sun' | 'pink' | 'lime' | 'rust'
              | 'glacier' | 'amber' | 'sage' | 'ice';  // the design system's block colors; never change with the season

interface Tag {      // a person; created from an event's Who field, never removed, renamed or recolored
  id: string;
  name: string;      // required, at most 32 characters, unique in the family ignoring case
  color: TagColor;
  createdAt: string; // tags are listed oldest first
}

interface CalendarEvent {
  id: string;
  startAt: string;  // ISO, UTC
  endAt?: string;   // absent = "No end time"; after startAt on the same local day (TPK-07)
  allDay?: true;    // fills its date: startAt = the date's UTC midnight, no endAt (EVT-08)
  title: string;    // required
  location?: string;
  everyone: boolean;   // true = every tag, including tags added later
  tagIds: string[];    // when not everyone: the tags on it, possibly none ("nobody")
  notes?: string;      // free text, trimmed
}

interface Note {
  id: string;
  text: string;     // required, multiline, at most 280 characters
  author: string;   // at most 32 characters; blank = unsigned
  createdAt: string;
  rotation: number; // degrees, cycles −2, 1.5, −1, 2.5
}

interface Photo {
  id: string;
  title: string;    // may be empty after an edit
  takenOn?: string; // ISO date; absent = "No date"
  place?: string;   // "City, ST" or free text
  createdAt: string;
  sources: {        // where each value came from (PHOTO-10/12)
    title: 'photo' | 'file-name' | 'place' | 'file' | 'edited';
    takenOn: 'photo' | 'file-name' | 'file-date' | 'none' | 'edited';
    place: 'photo-location' | 'none' | 'edited';
  };
  checked: boolean; // saved once in Photo details; the guessed hint shows until then
  fileName?: string;
}
// Image URL: /api/photos/{id}/file?v=display|thumb|orig

interface Weather {
  location: string;
  fetchedAt: string;
  current: { temp: number; condition: string; icon: WeatherIcon; high: number; low: number;
             feelsLike: number; windMph: number; windDir: string; humidity: number; uv: number; sunset: string };
  hourly: Array<{ time: string; icon: WeatherIcon; temp: number; precip?: number }>; // 8 points
  daily:  Array<{ date: string; icon: WeatherIcon; high: number; low: number; precip?: number }>; // 7 days
}
// Stored in °F; C = round((F − 32) × 5/9). No unit letter is shown.

interface AccountSettings {            // per account: every screen of the family shares them
  season: 'auto' | Season;             // Auto: Mar–May Spring, Jun–Aug Summer, Sep–Nov Fall, Dec–Feb Winter
  clock: '12h' | '24h';
  tempUnit: 'F' | 'C';
  background: { mode: 'season' | 'photo' | 'slideshow'; photoId?: string;
                dim: 0 | 0.2 | 0.4; rotate: 'hourly' | 'daily' | 'weekly' };
  idleTimeout: { on: boolean; minutes: number };  // 1–15; off = never, minutes kept for when it turns on
  noteExpiry: { on: boolean; days: number };      // 1–30; off = never, days kept
  hideSidebarWhenIdle: boolean;                   // SHELL-11
  ambient: { mode: 'same' | 'split' | 'off';
             all:  { start: string; end: string };   // "HH:MM", 15-min steps; every night, or Sun–Thu when split
             wknd: { start: string; end: string } }; // Fri & Sat nights when split
  ambientBrightness: 'full' | 'medium' | 'low';   // AMB-06
  weatherLocation?: { name: string; region: string; lat: number; lon: number; timeZone?: string };
}

interface Account { id: string; email: string; name: string | null } // name null until SIGNIN-06
interface Display { id: string; accountId: string } // kind, browser and lastSeenAt are server columns, read through the screens list (SET-12)
```

**Defaults:** season Auto, 12-hour, °F, background Season color (dim Light, rotate Daily), idle on · 3 min, notes on · 7 days, hide sidebar when idle on, ambient Every night 6:00 PM – 7:30 AM (weekends 9:00 PM – 9:00 AM), ambient brightness Medium.

**Account model:** one family = one account = one email. Sign-up and sign-in are the same email-code flow (SIGNIN-12). Events, tags, notes, photos and settings belong to the account; a display is one signed-in screen with no settings of its own.

**Tags** are the family's people: a name with a color that marks events; they never sign in. They work like tags: there is no list to manage, a tag exists because an event's Who field created it (FAM-04), and tags are never removed, renamed or recolored. A new account gets one tag named after the account (SIGNIN-06), with the first color. An event's people are **everyone** (the flag, set when every tag is on it; a tag added later joins it), a set of tags, or **nobody**; "who" reads "Everyone", the names in tag order joined by ", ", or nothing. An event's color: one tag → that tag's color; more than one, everyone or nobody → the season soft color with person dots (no dots for everyone or nobody).

### 7.0 Database
PostgreSQL, from `db-migrations/`:

| Table | Columns |
|---|---|
| `accounts` | `id`, `email citext UNIQUE`, `name`, `time_zone` (the first browser's zone), `setup_done_at` (first-run location step ended), `created_at` |
| `displays` | `id`, `account_id`, `last_seen_at`, `kind` (`monitor` default), `browser` |
| `sessions` | `token_hash`, `display_id`, `created_at` |
| `sign_in_codes` | `email citext` (one live code per email), `code_hash`, `time_zone`, `attempts` (0–5), `expires_at`, `created_at` |
| `magic_links` | `token_hash`, `account_id`, `display_id` (QR links, SIGNIN-15), `expires_at`, `used_at` |
| `tags` | `id`, `account_id`, `name`, `color`, `created_at`, `updated_at`, `deleted_at`, `version` |
| `events` | `id`, `account_id`, `title`, `start_at`, `end_at` (`> start_at`), `all_day` (no `end_at` when true), `location`, `everyone`, `tag_ids text[]` (empty when `everyone`; empty and not `everyone` = nobody), `notes`, `updated_at`, `deleted_at`, `version` |
| `notes` | `id`, `account_id`, `text`, `author`, `rotation`, `created_at`, `updated_at`, `deleted_at`, `version` |
| `photos` | `id`, `account_id`, `title`, `taken_on date`, `place`, `title_source`, `date_source`, `place_source`, `checked`, `file_path`, `file_name`, `created_at`, `updated_at`, `deleted_at`, `version` |
| `settings` | `account_id`, `json jsonb` (AccountSettings), `updated_at`, `version` |
| `weather_cache` | `account_id`, `location` ("lat,lon"), `json`, `fetched_at` |
| `sync_state` | the one global `version` counter |

- IDs are UUIDv7 made on the client, so offline creates keep their id.
- Timestamps are `timestamptz` and ISO-8601 UTC strings everywhere else; `taken_on` is `YYYY-MM-DD`.
- The server stamps `updated_at` and `version`; every write bumps `sync_state.version` in the same transaction. Deletes are soft (`deleted_at`) so other screens receive them.
- Photo files are stored as `{account}/{id}.{orig|display|thumb}` under `{DATA_DIR}/photos` or in an S3 or R2 bucket, served through an authenticated route. Deleting a photo deletes its files.

### 7.1 Event status (STATUS-01)
For today: `past` if `end ≤ now`, `now` if `start ≤ now < end`, else `upcoming`. No end → `now` from its start to the end of its day. Recomputed every minute. Past days → `past`, future days → `upcoming`. **All-day events have no status:** never the hero, never now or next.

### 7.2 Time formatting (TIME-01)
| Context | 12-hour | 24-hour |
|---|---|---|
| Clock, event summary start, sunset, Ambient, sync time | `10:41 AM` (mono AM/PM) | `10:41` |
| Hero "until {end}" | `until 11:15` | `until 11:15` |
| Plan cards, ranges | `9:00 – 10:30 AM`, `11:00 AM – 1:00 PM` (one-line cards: `9:00`) | `09:00 – 10:30` |
| Countdowns, free slots | `45 min`, `1 h 20 min` | same |
| Event lengths (TPK-01, EVT-09) | `45 min`, `1 hr 30 min`, `1 hr` | same |
| Hourly forecast | `4 PM` | `16:00` |

---

## 8. Screens

### 8.1 Sign in & account — `SIGNIN`
Layout: left = block-1 hero: "Glance" wordmark; top right the date and time ("Tuesday, October 20 · 10:41 AM", follows the clock setting; small "Tue, Oct 20", wrapping under the wordmark if needed) and the season icon (no season text, no Clock); headline "Your family’s day, at a glance."; body "Calendar, weather, notes and photos for your family. Sign in to manage them."; then a static, non-interactive preview: a white tile "Today · 3 events" (School drop-off 8:00 past, Piano lesson 10:30 now, Soccer practice 4:30 PM), a block-3 weather tile (64°, `cloud-sun`, "Rain moving in after 4 PM") and a sticky note ("Soccer cleats are by the door", Mom, 8:12 AM). The note sits with the weather tile: under it beside the events tile on wide heroes, side by side below the events tile when the hero is narrow. No preview on small. Right = form, max width 560, with the lock footer "Only your family can see its calendar, notes and photos." in every form state. Sign-in always happens on the screen that asked for the code; there are no email links.

| ID | Requirement |
|---|---|
| SIGNIN-01 | **Email form:** eyebrow "One account per family", title "Sign in or get started", body "Enter your email. We’ll send a 6-digit code to sign this screen in. New here? The same code sets up your family’s Glance." Field placeholder `name@example.com`, primary "Send code" (→ icon). |
| SIGNIN-02 | Invalid email → "Enter a valid email address", cleared on the next keystroke. |
| SIGNIN-03 | **Sending:** "Sending…" disabled, email locked, soft tile "Sending a code to {email}" with a pulsing mail icon → Enter the code. A failed send returns to the form with the email kept and "Couldn’t send. Try again." under the field (clears on the next keystroke). |
| SIGNIN-04 | **Enter the code** (the same for new and known emails): eyebrow "Sign in", title "Enter the code", body "We sent a 6-digit code to **{email}**. It works once, for 10 minutes." `CodeField` labelled "Code": six white 8 px-radius cells (hairline ring, mono tabular digits) over one input (`inputmode="numeric"`, `autocomplete="one-time-code"`, max 6); non-digits and spaces are dropped, so pasting "482 913" works; the next empty cell has the 2 px black focus ring while focused; focus lands in it when the step opens. Primary "Sign in" is disabled until 6 digits are in; the 6th digit submits on its own. Checking: "Checking…", field locked. Below a hairline, ghost "Send a new code" and "Use a different email" (email kept); for 10 s after each send both are replaced by a mono timer "New code or different email in 0:10" … "0:01" (min height 44); a new send restarts it. "Send a new code" → Sending → Enter the code. |
| SIGNIN-17 | **Wrong code:** the field clears, every cell turns red, "That code isn’t right. Try again." in the TextInput error style, cleared on the next digit. The 5th wrong try kills the code: "Too many tries. Send a new code.", field disabled, and both ghost buttons show at once. |
| SIGNIN-06 | **"What's your name?"** on this screen, only for a new account: eyebrow "New family account", body "This is the first sign-in for {email}. Your name shows in Settings." Field "Your name" ("First name is fine"), primary "Continue" → SIGNIN-14. Empty → "Add your name". The server accepts at most 100 characters. Continue is disabled while saving; a failed save shows "Couldn’t save. Try again." |
| SIGNIN-08 | **Expired** (10 min on Enter the code): "This code has expired" · "Codes work for 10 minutes. Send a new one to {email}." + "Send a new code", "Use a different email". |
| SIGNIN-09 | **Signed in:** check icon, "Signed in", "Welcome, {first name}" (new) or "Welcome back, {first name}", "Opening Today…"; Today opens after 2.2 s ("Opening Photos…" and Photos for a PHOTO-03 code). After the right code: setup done → this step; no name → SIGNIN-06; location step unfinished → SIGNIN-14. |
| SIGNIN-10 | **Offline form:** banner "You're offline" · "A code can't be sent right now. Sending turns back on when the screen reconnects." Send disabled, email still editable. **Offline on Enter the code:** the code can still be typed; banner "You're offline" · "The code can't be checked right now. Sign in turns back on when the screen reconnects." Sign in and Send a new code are disabled and nothing submits until reconnect. |
| SIGNIN-11 | Settings › Sign out signs out **this screen only**, with no confirm, back to the empty form. Changes not yet synced on this screen are discarded. |
| SIGNIN-12 | **Codes:** one code signs up or in: an unknown email creates the account when its code is entered. A code is 6 digits, works once, for 10 minutes, and allows 5 tries; a new code voids older ones. The responses never reveal whether an account exists. **Email** (HTML with a plain-text part; source `docs/design/handoff/emails/sign-in-code.html`, the same for new and known emails): subject "Your Glance sign-in code", preheader "{code} is your Glance code. It works once, for 10 minutes." Header "Glance"; a hero in the season's block-1 color on its soft page color (the account's fixed season, else the send date's) with mono eyebrow "Sign-in code", title "Your sign-in code", "Enter this code on the Glance screen that asked for it. New here? The same code sets up your family’s Glance.", the code large in a white tile and mono "Works once, for 10 minutes"; a white card "Glance never asks for this code by phone, text or email. Only type it on your Glance screen.", then "Didn’t ask for this? You can ignore this email. No one can sign in without this code."; footer "Sent to {email} because it was entered on a Glance screen. Glance · Calendar, weather, notes and photos for your family." No button or link. The text part carries the same words and the code. |
| SIGNIN-13 | **Signed out by the server** (an online 401; never while offline; no reason shown). **Form:** the SIGNIN-01 form with a banner "This screen was signed out" · "Sign in again to keep the calendar, notes and photos up to date.", title "Sign in again", body "Check your family’s email below. We’ll send a code that signs this screen back in.", the last email prefilled. **Waiting changes:** the banner adds "Changes waiting on this screen: {n}. They’ll be sent after you sign in." **Different email:** with changes waiting, a tile under the field reads "Changes waiting on this screen belong to {previous email}. They’ll be removed from this screen if a different email signs in." with ghost "Use {previous email}", and the banner drops its second sentence. **Timing:** never interrupts an edit; the form shows once the sheet closes or no field is focused, or at the idle timeout (to Ambient during ambient hours, AMB-07). **Clears** only when a sign-in finishes: the same email syncs the waiting changes, another email removes them. |
| SIGNIN-14 | **"Where is this screen?"** while the first setup isn't finished: after SIGNIN-06, or on the next sign-in of an account whose step never ended. Eyebrow "New family account", body "The weather and the clock’s time zone follow this place. You can change it later in Settings." The setup card (WX-04) with primary "Continue", "Use my location", and below a hairline ghost "Skip for now". A found place is saved → Signed in (no zone confirm). Skip → Signed in, cancelling any search or locating. Either ends the first setup. A failed save or skip shows "Couldn’t save. Try again." with the place kept; Continue saves it again, editing the field drops it. |
| SIGNIN-15 | **QR sign-in** (Settings › Account, under the screen list): secondary "Sign in another device" (`qr-code`) → a block-1 tile with the code on white, "Scan to sign in", "Open the camera on the other device and point it at the code. It signs in with {email}.", mono "Code expires in {m:ss}" from 5:00, ghost "Done". The code is a one-time link for this account that signs the opener in (SIGNIN-09 "Welcome back"). At 0:00 a new code replaces it. A code works once, for 5 minutes, and a new one voids the old. While a code is made the box is empty at 5:00; a failure reads "Couldn’t make a code. Try again." with "Try again" (`rotate-cw`) before "Done". Done or leaving Settings voids the code. Offline the buttons are disabled. A used or expired code opens the email form, never showing the account email. Anyone who can see the screen may scan it. |
| SIGNIN-16 | **Guest sign-in** (demo site only): a secondary "Sign-in as guests" (`user-round`) next to "Send code" signs this screen in at once to the shared guest account named by the server's `GUEST_EMAIL` (on the demo site: Trinh, guests@takeaglance.app, Carmel, IN 46032, Eastern time) as a returning account → SIGNIN-09 "Welcome back, {first name}". With no such account the button stays hidden. Disabled while a code is sending and offline; hidden on the signed-out form (SIGNIN-13). A failure shows "Couldn’t sign in. Try again." under the buttons. Everyone who uses it shares that family's data. The server creates that account on first boot, filled with a family of six (Trinh, Daniel, Minh-An, Minh-Hy, Bao, Grandma): school days, lessons, sports, holidays and one-off plans from the 1st of the current month to Dec 31, a few notes and 14 family photos. |

### 8.2 Today — `TODAY`
Zones: Now panel (block-1), schedule (white panel), notes (white panel), Today’s photo (white panel), 24 px apart at every size.

| ID | Requirement |
|---|---|
| TODAY-01 | **Now panel:** groups stack from the top, 24 px apart: the date with the season icon after it (18 px: `flower-2`, `sun`, `leaf`, `snowflake`) and the Clock; the weather now; the event summary. The weather and the event each start with a 1 px white divider and 24 px above their content; spare height stays at the bottom. No season label and no separate weather card. Tap cues: the weather eyebrow "{city} · Now" and the event eyebrow ("Happening now" / "Up next") end with a 16 px `chevron-right` (stroke 2, centered on the caps line, 6 px gap; on the event before the countdown pill). Sizes follow the panel's width: Clock `31cqi` (56–200 px), temperature `17cqi`, event title `12cqi` (32–64 px), at most two lines with "…". The panel is never narrower than 280 px and always shows everyone's plans. **Small:** no Clock; the date with the season icon, then a 60 px weather row under a white divider (40 px icon, 44 px temperature, "High {h}° · Low {l}°" and "Rain from {time}" at 15 px, `chevron-right`; → Weather), then the event; as tall as its content. |
| TODAY-02 | Event summary (timed events only), a button: running → eyebrow "Happening now" + black pill "{n} left", title, "{location} · until {end} · {who}"; running with no end → no pill, "{location} · started {start} · {who}"; next → "Up next" + black pill "In {n}", title, "{location} · {start} · {who}"; all ended → "That's a wrap for today" / "{n} events done · free until 9 PM"; none → "The day is wide open" / "Free until 9 PM · {time left}". The last two are the **open day** state (TODAY-13). Durations as §7.2 ("45 min", "1 h 20 min"), a part minute counting as a whole one. With several running, the one that started last (ties: the shorter one). |
| TODAY-03 | Tapping the event summary, a plan, a long-plan strip, an all-day tile or a Coming up row opens Event details (EVT-09). Tapping a free slot opens New event at that slot (TL-08). The "+{n} MORE" tile opens Calendar on today (TL-12). |
| TODAY-04 | **Schedule header:** the eyebrow counts what is still ahead: "Today · {left} of {n} left" (plans not yet ended plus all-day events), "Today · All done" once everything has ended, "Today · No events" with none; on a card narrower than 450 px "{left} left today" / "All done" / "No events". Ghost "Add event" (`calendar-plus`; not while the schedule loads or fails) and "Full calendar" (`calendar-days`) are text buttons from 1440 px window width, else 56 px IconButtons named by their labels; on a card narrower than 450 px 44 px IconButtons, so the header stays on one line. The card's top padding is 12 px with 44 px header buttons and 8 px with 56 px ones, so its eyebrow lines up with the notes and Today’s photo eyebrows. **Person filter** under the header (hidden with one tag): CAL-05's stack with 40 px color circles without initials, −12 px overlap, 2 px white ring, up to 5 circles or 4 + "+N" (3, or 2 + "+N", on a card narrower than 450 px), then the label and a chevron → "Show plans for". It is the same filter as Calendar's, so changing it on one view changes the other. It filters the timeline, all-day tiles, free slots, Coming up and the count; "Add event" pre-fills the people shown. The 450 and 400 px card-width rules are re-checked on every render. |
| TODAY-05 | Plans move past → now → upcoming live; the event summary swaps at each start and end, and its countdown updates every minute. |
| TODAY-06 | **No events today** (no timed or all-day plans today for the people shown): no timeline, since the Now panel's ribbon already shows the free time. Eyebrow "Today · No events", header buttons as usual. Under the person filter a "Coming up" eyebrow and the next 5 plans after today for those people, in order: mono day ("Tomorrow", then "Wed, Oct 14") over the time or "All day" in a 128 px column (112 px on small); title 18 px / 540; person dots and "{who} · {location}" 15 px; hairlines between rows; tap → Event details (0.98 press). Nothing ahead → "Nothing else on the calendar yet." |
| TODAY-07 | **Today’s photo** panel (white, on every background): eyebrow "Today’s photo", ghost "Add photo" (`image-plus`) and "All photos" (`arrow-right`, only when there is no more row); on a panel narrower than 440 px both are 44 px IconButtons named by their labels. A 4:3 frame (radius 8; on large at most `25dvh − 24px` tall, uncapped on normal and small) cropped around the photo's focal point (portrait default 50% 30%), a button named "Today’s photo: {title}, {caption}" → Photos on that photo, paused (PHOTO-01). Then the title (one line on a panel 440 px or wider, two below): the photo's title, else its place, else its date; camera file names (`IMG_`, `DSC`, `PXL`, `MVIMG` …) never show. Then a mono caption: "On this day · {year}", else "{date} · {place}". With other photos, a 52 px "{n} more photos" row (hairline on top, up to 3 overlapping 28 px round thumbnails of other photos, `arrow-right`; named "{n} more photos, open Photos") → Photos. **Add photo:** on large it opens "Add from your phone" inside the panel (the PHOTO-03 code on the block-1 tile, "Scan to add photos", "Point your phone’s camera at the code. The photos you pick show on every screen.", secondary "Choose files here" → file picker, ghost "Done"); on normal and small the file picker. **States:** loading = a pulsing frame; first upload = the preview at 60% with a progress bar, "Your first photo is on its way" and the mono upload status; didn't load = `image-off` "Photo didn’t load" ("Shows when back online" offline with no saved copy); no photos = a warm 8:7 tile with stacked frames, "A memory to share?", "{three moments}. Add family photos and one shows here each day." (three moments in a row from "Sunday pancakes", "the first snow", "a birthday cake", "pizza night", "the first day of school", "a day at the beach", "camping by the lake", starting at the day of the year, first letter capitalized) and a white pill "Add from your phone" (`smartphone`, large) or "Add photos" (`upload`, normal and small); the tile does what Add photo does. **Selection:** one photo per day, the same on every screen, changing at local midnight with the 600 ms cross-fade. First a photo taken on today's month and day in an earlier year (oldest year first); else the next photo in a shuffled cycle where every photo shows once before any repeats, new photos joining the end. "On this day" days don't use a cycle turn. Only finished uploads count, the current background photo is skipped, and an upload never changes the day's photo unless there was none. Deleting today's photo moves to the next one at once. |
| TODAY-08 | **Weather now** in the Now panel, a button named "Weather now" → Weather: "{city} · Now" ("{city} · Updated {time}" for a saved forecast after a failed fetch, FAIL-02), condition icon + temperature, "{condition} · High {h}° · Low {l}°", and `umbrella` "Rain from {time}" at the first drizzle or rain hour of the hourly forecast. No location → `cloud-sun` "Set weather location" / "The forecast and the clock follow it." → Weather setup. Failure → `cloud-off` "Weather unavailable" / "Trying again in {n} min.", with no button (the Weather view keeps WX-05's "Try again"). |
| TODAY-09 | **Notes box:** eyebrow "Notes · {n}" ("Notes" while loading or with none), ghost "Add note" (`square-pen`) and "All notes" (`arrow-right`, only when every note shows); on a panel narrower than 440 px both are 44 px IconButtons named by their labels. Notes stack one per row at full width, 20 px apart, in 16 px panel padding; each is a button (0.97 press) named "Note from {author}: {text}" ("Note: {text}" unsigned), the text cut at 3 lines with "…" → Note details (NOTE-10). **How many:** large shows the two newest when both fit above Today’s photo, else one; normal and small up to two. **More row:** with notes not shown, a 52 px row pinned to the panel's bottom → Notes: hairline on top, up to 3 overlapping 28 px paper dots (2 px white ring, −8 px overlap), "{n} more notes" (17 px / 480), `arrow-right`; named "{n} more notes, open Notes". **Empty:** the whole dashed card is one button → New note: the blank note pad (NOTE-07; hidden under 440 px), "Something to share at home?", "Milk in the fridge, flowers to water. Leave a note for the family." and an "Add note" pill label; no header buttons. **Loading:** season-soft tiles shaped like notes (150 px, radius 6, −2° / 1.5°), as many as will show; the header shows "Add note" only. |
| TODAY-10 | On a photo background every zone sits on its white panel. |
| TODAY-11 | **Schedule** (large and normal) = the day timeline (§8.3.2) for today, filtered by the person filter, with no rain chips: passed hours weigh × 0.3, an 80 px gutter with sparse hour weather (TL-07), 120 px minimum columns (TL-12) and long-plan strips (TL-13). Type for standing distance on large: plan title 20 px, mono times 16 px, who and notes lines 16 px, hour labels 16 px, one-line plans 18 px; normal 18 / 14 / 15 / 14 / 17. On a card narrower than 400 px the now line's pill is a 14 px black circle, and hour labels hide only within 10 px of it. The card is at least 300 px wide and 500 px tall. Large: it fills its column and the timeline fits it. Normal: the timeline starts at 536 px and grows (up to 3×) until every current and upcoming plan has room for its full card (92 px for 30 min or more, 66 px shorter); nothing scrolls inside the card, the page scrolls. **Earlier fold:** the timeline starts at the current hour (5 AM at the earliest, 8 PM at the latest) and leaves out ended plans; a soft 44 px pill under the person filter, "Earlier · {n} done" (`chevron-down`, 16 px / 480), shows the whole day from 5 AM with past plans as TL-05; "Hide earlier" (`chevron-up`) folds it again. Hidden when nothing has ended. **Small:** no timeline; the card shows today's day list (CAL-10), whose "Show {n} earlier" shares the fold's state. Every plan from 5 AM to 9 PM stays on the schedule; there is no "See all" row. |
| TODAY-12 | **All-day events:** soft tiles (min height 56, radius 8) above the timeline, in event order: mono "ALL DAY", person dot (soft for shared), title, "{who} · {location}". They never show in the event summary and never strike through. |
| TODAY-13 | **Open day** (no timed event running or later; same state as TODAY-02): eyebrow "Today · Open", the title and line, then a day ribbon 5 AM to 9 PM, the timeline's span: a 14 px white pill track, the elapsed part black up to now, a 32 px black now marker with a white 20 px `clock` icon (stroke 2) and 4 px white ring, a mono "Now {time}" label above it, a 2 px black tick at sunset with a `sunset` icon above (no time), mono "5 AM" / "9 PM" below. On a wrapped-up day each ended event is a white inset bar on the black part. No "Next on the calendar" tile: what comes next shows in the schedule (TODAY-06). |
| TODAY-14 | **Layout** (Now panel). **Large:** three columns `minmax(280px, 0.8fr) minmax(300px, 1.8fr) minmax(280px, 0.95fr)` (about 404 / 909 / 480 px at 1920), areas `"hero sched notes" "hero sched potd"`, rows `minmax(0, 1fr) auto`, as tall as the window minus two gutters: no page scroll. **Normal:** two columns `minmax(280px, 0.8fr) minmax(300px, 1.2fr)`, areas `"hero sched" "notes potd"`; the first row is at least `max(500px, 100vh − gutter − 90px)`, so the top of the second row shows on a short day, and grows with the schedule (TODAY-11); the page scrolls. The Now panel stretches to the first row and its content sticks one gutter below the top of the screen while the schedule scrolls past, stopping at the panel's bottom edge. **Small:** one scrolling column (`minmax(280px, 1fr)`; windows under 320 px scroll sideways): Now panel, schedule, notes, Today’s photo. The gutter runs on all four sides, so a scrolling page ends one gutter from the bottom. Today’s photo is as tall as its content (TODAY-07) and the notes panel takes the rest of its column, its more row pinned to the bottom and its empty tile filling it. Body type grows by min(width ÷ 1920, height ÷ 1080), between 1× and 1.5×. |

### 8.3 Calendar & events — `CAL`, `EVT`
Large and normal: the week strip card on top (CAL-01), then one white panel with the person filter (CAL-05) and the Today button (CAL-02) in its header, the all-day tiles, the day timeline (§8.3.2) and the 24 hours link (CAL-06). Small: the header card (CAL-02), then the day list card (CAL-10).

| ID | Requirement |
|---|---|
| CAL-01 | **Week strip** (large and normal): a week-range eyebrow (mono 14 px: "Oct 4 – 10", "Sep 27 – Oct 3" across two months, the year added only outside the current year: "Dec 27 – Jan 2, 2027") over the month name of the week's Saturday with no year, prev/next IconButtons (56), the 7 day cells Sunday to Saturday, then Add event (CAL-07). Strip card: 4 px top and bottom padding, 12 px sides, 8 px between the label, chevrons, days and Add event. Day cell (2 px apart, radius 16, 8 px top and bottom and 4 px side padding, items centered 4 px apart; the whole cell is the button, 0.97 press): mono 13 px weekday, the date in a circle, then an info row (min 18 px) that wraps when the cell is narrow. The circle is 56 px when each cell is at least 120 px wide, else 48 px; date 28 px / 480, tabular. Selected = black circle with a white date (180 ms). Today, when not selected = `surface-soft` circle. Other dates have no fill. Info row: on cells at least 120 px wide a mono 13 px count ("1 event", "6 events": every plan that day, whatever the filter; nothing on empty days); on narrower cells one 8 px dot per tag with a plan that day (3 px apart, up to 3, no "+N"). Then, on cells at least 56 px wide, the day's forecast 12 px after it (18 px icon + 15 px / 480 high) on days that have one. Cells measure their own width. |
| CAL-02 | Chevrons step a week; landing on this week selects today, any other week its Sunday. **Today button** (large and normal): with another day selected, a ghost "Today" (`undo-2`, soft fill, 48 px) at the right end of the panel header, opposite the person filter; tap → today. **Small header** (replaces the week strip): a white card (radius 24, 12 px sides, 12 px top, 8 px bottom) scrolling with the page, no shadow. Row 1 (8 px gaps): the week-range eyebrow over the month ("October", 24 px / 340) and a 20 px `chevron-down`, one button → date picker (CAL-03); then three 44 px soft IconButtons: previous week, next week and Add event (`calendar-plus`). Row 2: the 7 days, one column each: weekday letter (mono 13 px), a 44 px day circle (20 px / 480; selected black, today `surface-soft`), up to 3 6 px person dots under it. 24 px to the day list. |
| CAL-03 | **Date picker** (small): a centered modal over the scrim (8 px from the window edges, max 480 px wide, radius 32, padding 20 px top, 8 px sides, 24 px bottom). Header "Pick a date", ghost "Today", Close. Then the month title ("October 2026", 22 px / 540) with previous and next month IconButtons (44 px, soft), from January of this year to December of next year. Body: the design system's MonthGrid without its title (cell = (window width − 80) ÷ 7, 36–56 px): selected black, today a 2 px ring, days with plans a season-accent dot. Opens on the selected day's month. A day → selects it and closes; Today → today and closes; scrim or Close → no change. No weather. |
| CAL-04 | The timeline fills the panel with no scroll; with 24 hours on its minimum height is 760 px and the page scrolls. Changing the day or the filter reflows the timeline over 280 ms. `/calendar?date=` selects that day. |
| CAL-05 | **Person filter** (`WhoStack`, opening `WhoSheet`): one button. Large and normal (panel header): a 48 px tall stack of 44 px tag-color circles with initials (15 px / 540), overlapping by 4 px with a 2 px white ring, each over the one before; up to 8 circles, or 7 + a "+N" circle (`surface-soft`); then the label (17 px / 480) and a `chevron-down`. Small (top of the day list card): the same with up to 4 circles, or 3 + "+N" (3, or 2 + "+N", while Go to today shows). Today's variant: TODAY-04. Circles show only the people shown; nobody = one gray circle. **Label:** "Everyone" when all are shown, the names for 1–2 ("Mom, Tin"), "{n} people" for 3 or more, "No one" for nobody. **Initials:** a name of 3 letters or fewer in full, else the first letters of its first two words, else its first two letters. **Show plans for:** a centered modal over the scrim (max 480 × 760 px, radius 24): eyebrow "{n} members", title "Show plans for", Close; 56 px rows with hairlines: "Everyone" (`users`) first, then each tag: a 32 px color circle with initials, the name (18 px / 480) and a 28 px checkbox (radius 8; checked = black with a white `check`, else a 1.5 px black ring). A row toggles that tag; Everyone selects all, or clears all when all are selected. Changes apply at once. Primary "Done" (full width), Close, a scrim tap or Escape closes it and focus returns to the stack. Every tag is selected by default. A plan shows when any selected tag is on it; everyone plans show while any tag is selected; nobody plans only while every tag is selected. Turning every tag off leaves no plans, tiles or free slots. Filters the timeline or day list, all-day tiles and free slots; week counts and dots always show everyone. One filter for Today and Calendar, belonging to this tab; `who=` sets it (`who=none` = nobody), `whosheet=1` opens the list. |
| CAL-06 | **24 hours** (large and normal): a centered text link under the timeline at the bottom of the card (14 px / 480, underlined, 32 px tall, then a 14 px icon: `chevrons-up-down` off, `chevrons-down-up` on; close to the timeline). Off: 5 AM to 9 PM, "Show all 24 hours", or "Show all 24 hours · {n} more plans" when the day has plans that start before 5 AM or end after 9 PM. On: 12 AM to 12 AM (TL-06), "Show 5 AM – 9 PM only" ("05:00 – 21:00" on the 24-hour clock). Stays on across days for this tab. |
| CAL-07 | **Add event:** at the right end of the week strip, 16 px after the next-week chevron, `surface-soft`, 56 px tall: a pill with `calendar-plus` and "Add event" from 1400 px window width, else a 56 px IconButton named "Add event"; on small in the header (CAL-02). → New event on the selected day for the people shown (everyone when all are, nobody when none are). |
| CAL-08 | Empty day: the timeline shows one free slot, "Everyone free · 16 h" (or "Free · 16 h"). No events at all: the tile (`calendar-days`) "The calendar is empty" / "Select a day, then add an event. Days with plans get a dot for each person." replaces the timeline (on small without the box). |
| CAL-09 | All-day tiles above the timeline, as TODAY-12, filtered by CAL-05. |
| CAL-10 | **Day list** (small; also Today's schedule on small): a white card (radius 24, 12 px sides, 24 px bottom), 24 px between groups. Top row: the person filter and, with another day selected, a 44 px soft "Go to today" IconButton (`undo-2`) on the right. All-day tiles (radius 8, 52 px: mono "ALL DAY", person dot, title, location) above the groups. Plans follow one another in start order, never in columns. **Plan tile** (radius 8, padding 10 px top and 12 px sides and bottom, 8 px apart, no dividers), colored as TL-05, shared plans with up to 4 8 px person dots at the right of the time line: the mono 14 px time range (the start only with no end), the title (17 px / 540, up to 2 lines), "{who} · {location}" (15 px / 330, one line, "…"), then an optional line with a white "{p}% rain" chip (rain ≥ 50%, with an hourly forecast) and the first line of Notes (`file-text`, 15 px / 480). Tap → Event details. **Today:** a soft 44 px "Show {n} earlier" pill (`chevron-down`) that shows the ended plans in place ("Hide earlier", `chevron-up`; folded by default), then "Happening now" (mono eyebrow, 12 px inset), then "Later today · {n}". **Other days:** one group "{n} events" ("1 event"). **Free time:** TL-08's gaps (on today only after now), in order, as 44 px dashed tiles (2 px hairline, radius 8) with the start time, "Everyone free · {length}" or "Free · {length}" (mono 13 px, wrapping under the time, never cut) and a `plus`; tap → New event in that slot. **Empty:** "Nothing scheduled." (then the free tile); nobody selected: "No one selected, so no plans show."; no events at all: CAL-08. No hour grid, now line, hour weather or 24 hours link. |
| EVT-01 | **Event page** "New event" / "Edit event" / Event details: a full-screen page over everything including the nav, no scrim; it slides in from the right (280 ms ease-out) and out to the right (ease-in). Notes, photos and Photo details stay modal sheets. Header (white, sticky, hairline): 56 px Back (`arrow-left`), the eyebrow "{Weekday}, {Mon} {d}" with the day's forecast 12 px after it (16 px icon + high, °F/°C setting, only with a location and a forecast for that day), the title, and at the right end the actions (EVT-05, EVT-06, EVT-09). On small the actions move to a bottom bar and the header holds Back and the title. The whole page scrolls; the form is centered at 720 px max. |
| EVT-12 | **Quick date change** (New event, Edit event): the eyebrow is a button (16 px `calendar-days` before the date, `chevron-down` after, 44 px hit area). It opens a 352 px white popover (radius 24) with chips Today · Tomorrow · Next week (same weekday + 7 days) and a month grid (‹ ›, 44 px day cells; selected black, today 2 px ring). A day sets the date, keeps the times and closes; outside tap or the eyebrow again closes unchanged. Opening it closes any time picker. A changed date counts as a change: Cancel and Back ask "Discard changes?" |
| EVT-13 | **Day preview** (event page, large and normal; hidden on small): a column on the right (34%, at least 380 px, hairline on its left) that follows the chosen day and times live. A `surface-soft` weather tile (40 px icon, temperature at the start hour, condition, "· {n}% rain" at 30%+; for events over an hour an hourly strip, up to 6 hours; all day = the day high; no forecast → "No forecast for this date yet."; hidden without a location). Then "Also at this time · {n}": the plans overlapping the chosen time (all-day included) as plain text: mono time line ("8:15 AM – 3:00 PM", "All day") then "{title} · {who}"; none → "Nothing else at this time." The chosen time with no end counts as 30 minutes, another plan with no end as its start minute. |
| EVT-02 | Fields: Title* ("What's happening"), Starts and Ends (§8.3.1), the **All day** row (EVT-08), **Who**, Where ("Home, school, park…"), **Notes** (3 rows, "Anything to remember", saved trimmed). Events have no color of their own. |
| EVT-03 | Empty title → "Add a title", cleared on the next change. |
| EVT-04 | Time entry and validation: §8.3.1. |
| EVT-05 | Primary "Save event" (new) / "Save" / "Save for later" (offline), with a `check` icon. Secondary "Cancel". Back closes at once when nothing changed; otherwise the actions swap in place to "Discard changes?". |
| EVT-06 | Delete (edit only): ghost "Delete" → `danger` "Delete event?" inline confirm. |
| EVT-07 | Save closes the page, or returns to Event details when editing from there; the timeline, week dots and Today update at once. |
| EVT-08 | **All day:** a left-aligned row under Starts and Ends (56 px tall; label, then 16 px after it a `Switch`); the whole row is the tap target. On: Starts and Ends stay but are disabled (transparent with a hairline, times struck through, no length label, taps do nothing), any open picker closes and any end-time error clears; the event fills its date. Off: the fields return with the draft's times, or the TPK-05 defaults. No TPK-07 check. Ambient reads "All day". `sheet=allday`. |
| EVT-09 | **Event details** (read-only; every tap on an existing event opens it, new events skip it): Back, eyebrow = the day, title = the event title. A color block (the event's color, radius 24) with a mono label (the length "1 hr", "No end time" or "Whole day") over the time in large light numerals with mono AM/PM, or "All day"; on today a black "Happening now" pill while running. Rows with an icon, a mono label and hairline dividers, hidden when empty: **Who** (dot + name pills, white; "Everyone"; hidden for nobody), **Where**, **Notes** (line breaks kept). Action: a single primary "Edit" (`pencil`) in the header (on small the bottom bar). An ended event (ended today, or any earlier day) shows a hairline "Ended" pill, no Edit, and in the action area "This event has ended and can't be changed." No offline banner. |
| EVT-10 | **Edit from details:** "Edit" swaps the same page to Edit event. Cancel returns to details (after "Discard changes?" when changed; Discard returns to details). Back closes the page (same check). Delete closes it. |
| EVT-11 | **Who** (a tag field): a 56 px hairline field (radius 8) holding the event's tags as pills in their color (44 px, name + a 36 px ✕ named "Remove {name}"), then an inline input, placeholder "Add a person" ("Add someone else" once someone is added), max 32 characters. When every tag is on the event the pills collapse into one "Everyone" chip (`surface-soft`, 16 px `users` icon); its ✕ ("Remove everyone"), or Backspace in the empty input, clears the field, and adding the last missing tag collapses the pills into it. **Suggestions** appear only while typing: white pills (dot + name, 48 px) for tags not yet on the event whose name fuzzy-matches, best first: starts with it → a word starts with it → contains it → its letters appear in order ("mnh" → Minh-An) → one typo away (3+ characters); matching ignores case, accents, spaces and hyphens; no match → no Suggestions block. A tap adds that tag and clears the input. Enter on an exact name (any case) adds that tag. Backspace in an empty input removes the last pill. Nobody is allowed. Saving with every tag on it stores everyone. New events start with the Calendar filter's tags, or everyone. |

#### 8.3.1 Time entry — `TPK`

| ID | Requirement |
|---|---|
| TPK-01 | **TimeField:** label (body-lg), and for Ends the length in mono ("1 hr", "45 min", "1 hr 30 min"). A 56 px button, radius 8, hairline border: time (22 px tabular, 19 on small), mono AM/PM, chevron. Open = black border + 2 px ring. Error = `--danger` border + mono error below (`role="alert"`). `aria-label` "{Starts\|Ends}, {time}. Change". |
| TPK-02 | Starts and Ends side by side. Tapping one opens the TimePicker below the row; one at a time; tapping the open field or "Done" closes it; opening doesn't scroll the page (only an "Ends before it starts" error does). No keyboard and no typing. |
| TPK-03 | **TimePicker:** a `surface-soft` tile (radius 24, padding 16, 12 on small), a group named "Start time"/"End time", opening directly below the Starts/Ends row and above the All day row: clip reveal + fade + 6 px drop, 260 ms `cubic-bezier(0.2, 0.8, 0.2, 1)`; switching Starts ⇄ Ends doesn't replay it and closing is instant. Header "{Starts\|Ends} · {time}" + (12-hour only) a sliding AM/PM toggle at the top right: a 144×44 white pill with mono "AM" and "PM" always visible and a black knob that slides under the chosen label (220 ms; the chosen label turns white). "Hour": 12, 1 … 11, or 00 … 23. "Minutes": 00 … 55 by 5. 6 columns (4 on small), 44 px pill cells (hour, minute and Length chips alike): selected black/540, else white with hairline. Each tap changes one part. |
| TPK-04 | Ends adds "Length" chips (30 min · 1 hr · 1.5 hr · 2 hr) from Starts and a ghost "No end time" (✕). Footer: secondary "Done". |
| TPK-05 | **Defaults:** start at the next full half hour (10:41 → 11:00, 11:00 → 11:30), capped at 11:30 PM; end = start + 1 h, capped at 11:55 PM. |
| TPK-06 | Moving Starts moves Ends by the same amount (capped at 11:55 PM). An empty or invalid Ends stays put. |
| TPK-07 | Ends must be later than Starts on the same day; equal fails. Checked on Save with the title; Save stays enabled. A failure closes the picker and shows "Ends before it starts"; any change clears it. |
| TPK-08 | **No end:** the field reads "No end time" (330); the plan card shows only the start and ends at the end of its day for layout; the event summary reads "{where} · started {time}". Tapping Ends fills Starts + 1 h. |
| TPK-09 | The Clock setting drives fields, picker and plan cards. Offline is the same, with "Save for later". |
| TPK-10 | Cells use `aria-pressed`. Hours say "3 PM" or "15 hundred"; minutes "{n} minutes". |

#### 8.3.2 Day timeline — `TL`
Used by Calendar (any day, filtered) and Today (today, filtered) on large and normal; small uses the day list (CAL-10). Pure layout rules live in `src/domain` (tech design).

| ID | Requirement |
|---|---|
| TL-01 | **Span** 5 AM to 9 PM (Calendar can switch to 24 hours, TL-06). It fits its card with no scroll. Hour labels sit in a left gutter; a label hides when it would sit closer than 24 px to the one above or 22 px to the now marker. On Calendar every hour row is at least 26 px tall, so every hour gets a label except next to the now marker; the elastic height is shared out on top of that. |
| TL-02 | **Elastic hours:** an hour's weight = 1 + 3 × the share of that hour covered by plans of 3 hours or less (longer plans don't stretch hours). On today, hours that have fully passed weigh × 0.35 on Calendar and × 0.3 on Today. Heights are the weights scaled to the card. |
| TL-03 | **Overlaps:** overlapping plans share the width in columns; longer plans take the leftmost column, and a plan widens into free columns beside it. Every plan is at least 44 px tall (48 px with the 4 px gap). Plans over 3 hours leave the columns (TL-13), and the columns are capped (TL-12). |
| TL-04 | **Plan cards** (radius 8, a button named "{title}, {range}"): content follows the card's real size: time + title, then a second title line, then "{who} · {location}", then the first line of Notes (`file-text`). Too short for that → one line: start time (hidden under 200 px wide; on the title line from 170 px), title, person dots. Under 260 px wide → the start time only, with AM/PM. A plan that started before 5 AM shows "Until {end}" for its time. Lines end in "…", never wrap. |
| TL-05 | **Colors:** the event's color (§7); past (STATUS-01) → white with a hairline, title weight 340, never struck through; now → 2 px black ring, no NOW pill. Other days are never now. |
| TL-06 | **24 hours** (Calendar only): 12 AM to 12 AM; night hours (before 5 AM, from 9 PM) without plans weigh half, night hours with plans are elastic as TL-02. Hour labels and hairlines thin out when rows get tight. |
| TL-07 | **Hour weather:** each hour label in the gutter shows that hour's weather under it (16 px icon named by condition + temperature, 15 px / 480; on Today 20 px + 17 px / 480, line 22 px) when the hour is at least 46 px tall and clear of the now marker. Calendar shows every hour; Today only where it says something new: the first hour on the timeline, an icon change, rain starting or stopping (50% or more), else every 3 hours. No weather lane: plans use the full width. On Calendar, plans that aren't past and overlap an hour with rain ≥ 50% get a white "{p}% rain" chip on the time line of cards at least 180 px wide (not on one-line cards; the chance stays in the plan's name). Only with a location and an hourly forecast for that day; covers all 24 hours when TL-06 is on. |
| TL-08 | **Free slots:** gaps of 30 min or more between 5 AM and 9 PM with no plan for the selected tags show as dashed tiles: "Everyone free · {length}" when everyone is selected, else "Free · {length}"; named "Free {range}. Add event". Long-plan strips count as busy. On today a slot starts at now. A slot shorter than 44 px isn't drawn. Tap → New event starting at the slot start rounded up to 15 min, 1 hour long or to the slot's end. |
| TL-09 | **Now marker** (today only): a 2 px black line across the timeline, drawn behind the plan cards, with a black mono time pill on top in the gutter (Calendar: 12 px, 2 × 6 px padding, 4 px from the timeline; Today: 14 px, 4 × 8 px, or TODAY-11's circle), moving every minute. |
| TL-10 | Tapping a plan opens Event details (EVT-09). Day or filter changes reflow over 280 ms (at once with reduced motion). |
| TL-12 | **Column cap:** overlap columns are at least 120 px wide on Today and 200 px on Calendar. When more columns overlap than fit, the columns that fit stay and the rest fold into a 52 px "+{n} MORE" tile on the right (season soft fill, hairline, 18 px count over mono 14 px "MORE", at least 48 px tall; the count alone under 60 px) spanning the folded plans' time range. Tap: Today → Calendar on today; Calendar → Event details of the earliest folded plan. Plans with nothing folded beside them use the full width. |
| TL-13 | **Long plans** (over 3 hours, e.g. School): 44 px edge strips between the hour gutter and the plans (8 px gap; several sit side by side): the plan's fill, radius 8, a vertical title (17 px / 540) and mono range ("8:15 – 3:00 PM"), cut at the strip's height; past and now as TL-05. A button named like a plan card, 0.97 press → Event details. The other plans use the remaining width. |
#### 8.3.3 Tags — `FAM`

| ID | Requirement |
|---|---|
| FAM-07 | Tags are the family's people (§7). There is no list or sheet to manage them and no Edit button on the person filter; they are never removed, renamed or recolored. |
| FAM-04 | **New tag** from the Who field: when the typed name matches no tag exactly (any case), a white tile between the field and the suggestions: "NEW MEMBER" + a preview pill in the chosen color, primary "Add member", then the 12 color swatches (44 px; the first color no tag uses is preselected, any color once all are taken). "Add member" or Enter creates the tag and puts it on this event. Offline it syncs later (SYNC-02). |
| FAM-05 | A new tag goes last in the filter and the week dots (selected when the filter shows everyone) and joins every everyone plan. |

### 8.4 Weather — `WX`

| ID | Requirement |
|---|---|
| WX-01 | Read-only. Left: `WeatherNow` "{city}, {state code} · Now" with "H {h}° · L {l}° · Feels like {f}°" under the condition, then Wind ("8 mph NW"), Humidity, UV index, Sunset (one row; a 2 × 2 grid inside the weather block on small). Right: Banner, "Next 8 hours" (time, icon, temp°), "7-day forecast" (today highlighted, rain % from 10%). |
| WX-02 | Values follow the unit setting, no unit letter. With °C wind is km/h. |
| WX-03 | Rain banner (cloud-rain) "Rain moving in after {time}" / "Grab an umbrella if you're heading out." when any of the next 8 hours is ≥ 50%, at the first such hour. Offline and the forecast over an hour old: "Forecast from {time}" / "Updates when the screen is back online. Conditions may have changed." |
| WX-04 | **Setup card** (no location): block-3, eyebrow "Weather · setup", "Where is this screen?", "The forecast and the clock’s time zone follow this place. You can change it later in Settings.", field "City or ZIP code" ("Portland, OR"), primary "Show weather" and secondary "Use my location" (LOC-01). Empty → "Enter a city or ZIP code". The same card is used by SET-09 (primary "Search") and SIGNIN-14 ("Continue"). |
| WX-05 | Loading skeleton; failure "Weather unavailable" / "The forecast service isn't responding. Trying again in {n} min." + "Try again". |
| WX-06 | Refreshes every 15 min. The location is changed in Settings › Location. |
| WX-07 | **Searching:** the buttons become "Looking for {query}…" with a pulsing search icon. Typing cancels. A failed search: "Place search isn’t responding. Try again in a moment." (text kept, cleared on the next keystroke). |
| WX-08 | Unknown place: "We couldn't find that place. Try a city and state, like Austin, TX". |
| WX-09 | **Several matches:** "{n} places called {city}", one 64 px row each (city, "{state}, United States · {time zone name}"). A tap sets the place and its time zone. Typing clears the list. A single match is set at once. US only; city, "City, ST" or ZIP; at most 5, largest first. |

### 8.5 Notes — `NOTE`
White panel: the count eyebrow (NOTE-06), "Notice board", "Add note" (`square-pen`; the lg 64 px Button on large, md 44 px on normal and small). Grid `auto-fill minmax(clamp(220px, 17vw, 340px), 1fr)`, gaps 36–48 px (four columns at 1920), notes at least 280 px tall on large and 200 px otherwise, note text 24–32 px (1.6vw). No caption under the board. Every note is one paper tone, the season soft color (cream in spring, summer and fall; frost in winter), so color on Today always means a person.

| ID | Requirement |
|---|---|
| NOTE-01 | "Add note" → New note; a note → Note details (NOTE-10); its Edit → Edit note. Each board note is a button (0.97 press) named "Note from {author}, {time}: {text}" ("Note, {time}: {text}" unsigned), with the text cut at a word after 120 characters with "…"; details show it in full. |
| NOTE-02 | **New note / Edit note** (`NoteComposer`): the whole sheet is the paper: the paper fill on the sheet and its sticky header and footer, radius 6, modal shadow; on large and normal pinned to the top (top padding `clamp(16px, 6vh, 64px)`, max width 640 px) so the keyboard never covers it, on small full screen with no corners. Header: eyebrow "New note" / "Edit note" centered on the ✕, no visible title (the dialog is named by it). Body on the paper: a borderless textarea (focused on open, at most 280 characters, placeholder "Leave a note for the family", 28–40 px (2.8vw) / 400, line height 1.25) that starts one line tall and grows with the text up to 50vh, then scrolls; 24 px under it a "From" TextInput (label above, white 48 px box, placeholder "Your name", at most 32 characters, kept as typed; not tied to tags). New note prefills the last name posted from this screen (blank at first); Edit keeps the note's author. In Edit, the author and time show in the footer. |
| NOTE-03 | Empty message on Post → "Write a message" in a red mono caption between the text and From. A blank name posts unsigned: the board and details show only the time. |
| NOTE-04 | Newest first everywhere. Board notes tilt −2°, 1.5°, −1°, 2.5° in turn, with a level-2 shadow. Stamp: "Just now" for 5 min, then the time the same day ("9:05 AM"), the short weekday and time within 6 days ("Tue 6:40 PM"), then "{Mon} {d}". |
| NOTE-05 | Footer: no Cancel (✕ closes, with the §8.9 discard check); primary "Post note" with no icon ("Save" when editing, "Save for later" offline) on the right; past 120 characters a mono "Board shows the first 120" on its left. |
| NOTE-06 | Count eyebrow "{n} notes · cleared after {n} days" ("1 note", "1 day"), "{n} notes · kept until deleted" while expiry is off, "No notes" when empty. |
| NOTE-07 | Empty board: a dashed outline box filling the board's height, with a blank sticky-note pad (three stacked paper sheets in the paper tone with soft shadows, the top one ruled with a black `plus` button) that opens New note, and centered copy (body 18–24 px) "Something to share at home?" / "Fresh milk in the fridge, flowers to water, a pickup at 5. Tap the pad and leave a note for the family." |
| NOTE-08 | Notes older than the expiry (`noteExpiry.days` × 24 h since created, while it's on) are deleted by the server and hidden by every screen, offline too. |
| NOTE-09 | Anyone can edit or delete any note. The board scrolls. |
| NOTE-10 | **Note details** (read-only): eyebrow "{author} · {time}" (the time alone when unsigned; "Waiting to post" until sent) centered on the ✕, no visible title (the dialog is named "Note from {author}", "Note" when unsigned). The sheet is the sticky note: paper fill (footer too), radius 6, straight (no tilt), modal shadow, no shadow under the sticky header or over the sticky footer. The full message in 32–48 px / 400 type with line breaks kept, nothing clipped, starting 12 px closer to the header. Footer: ghost "Delete" (`trash-2`) on the left → inline `danger` "Delete note"; primary "Edit" (`pencil`) on the right, which turns the same sheet into Edit note (NOTE-02). From Edit, ✕ returns to details (after "Discard changes?" when changed) and Save returns to details with the new text; the scrim closes the sheet; Delete closes it. No color picker and no offline banner in details. |

### 8.6 Photos — `PHOTO`
Left: soft block with the featured image (radius 8; at least 200 px tall on large and normal, 260 px on small), name, "{date} · {place}" and the featured actions (PHOTO-11). Right: white panel "Photos · {n}" (one line, "…"), ghost "Upload", a 4:3 thumb grid, 2 columns (selected ring `0 0 0 3px white, 0 0 0 5px black`), each with the name (15 px / 540, one line, "…") over the mono date (14 px), 2 px apart. Large and normal: the screen fits the window with no page scroll; the panel matches the featured block's height and the grid scrolls inside it (eyebrow and Upload stay put), following the slideshow: when the current photo is out of view it scrolls just enough to bring it in with 12 px to spare. Small: the grid runs full length in the page scroll.

| ID | Requirement |
|---|---|
| PHOTO-01 | A thumb features its photo. Chevrons wrap. `/photos?photo={id}` features that photo with the slideshow paused until someone steps, picks or plays; an unknown id opens as usual. `play=0` opens paused. |
| PHOTO-02 | Slideshow advances every 8 s while open. Pause ↔ Play. Chevrons and thumbs keep it playing. |
| PHOTO-03 | **Upload:** on large and normal it toggles an "Add from your phone" panel above the grid (soft tile: a 125 px QR code, "Scan to add photos", "Point your phone’s camera at the code and pick photos. They show here as they finish uploading.", secondary "Choose files here" → the file picker, ghost "Done"); on small it opens the file picker. The code is a one-time sign-in link for this account with SIGNIN-15's rules (works once, for 5 minutes, replaced at 0:00 while shown) that opens Photos on the phone, where Upload opens its file picker. The picker takes `image/*`, multiple. New photos go first, with details read from the file (PHOTO-10). `phqr=1` opens the panel. |
| PHOTO-04 | Size (≤ 20 MB) and type checks run before upload; upload shows real progress. |
| PHOTO-05 | Empty: image icon, "Photos · 0", "No photos yet", "Upload family photos to show them here, as the picture of the day and as a background." Large and normal: a white card with a 150 px QR code (PHOTO-03), "Scan to add photos" and ghost "Choose files here". Small and offline: "Upload photos". |
| PHOTO-06 | **Uploading:** each file shows first in the grid at 60% with an 8 px progress bar and mono "{n}%" ("Waiting" at 0). A row above reads "Uploading {name}" / "Uploading {n} photos" + average %. A tile becomes a normal photo at 100%. |
| PHOTO-07 | Uploads never block the slideshow; it uses finished photos only. With none yet: "Your photos show here once they finish uploading." |
| PHOTO-08 | **Per-file failure** (only that tile changes): the preview stays at 40% (soft fill without one), a white pill top-left names the short reason ("Over 20 MB", "Not a photo", "Failed"; named "Too large · 20 MB max", "Not a photo", "Didn't upload"), 56 px buttons sit bottom-right inside the tile, and the caption keeps the full name over mono "Not uploaded". Network failures get Try again (from 0%) and Remove; too large and not a photo Remove only. Row "{n} photo(s) didn't upload" with ghost "Try again" (only with a network failure in the set; retries all of them) and "Clear" (removes every failed tile). |
| PHOTO-09 | **Offline:** upload buttons disabled with the pill "Offline · upload when back online". Uploads pause ("Paused") and resume on reconnect (restarting from 0% if their send failed). Paused uploads are lost on reload. Row "Offline · {n} upload paused until back online". |
| PHOTO-10 | **Details from the file**, read on upload. **Name:** metadata title → words from the file name (camera prefixes, dates, digit runs and the words at, am, pm, copy, edited, final removed; needs a 3+ letter word; all-lowercase gets a capital) → the place's city → the file name without extension. Blank or camera-placeholder titles ("OLYMPUS DIGITAL CAMERA", "Default", "Image") don't count. **Date:** metadata date taken → a date in the name (`2025-10-31`, `20251031`) → the file's modified day → the upload day. **Place:** GPS → "City, ST" (US only), else empty. Until saved in Photo details, a hint under the featured photo: "Name and date guessed from the file name.", "Date guessed from the file date.", "Name guessed from where it was taken.", plus "No place found." |
| PHOTO-11 | The featured photo shows name and "{date} · {place}" (year outside the current year; "No date" without one). **Featured actions**, one row wrapping when narrow: ghost Set as background (PHOTO-15), "Edit details" (`pencil`; opens Photo details and pauses the slideshow) and "Delete" (PHOTO-13); then 56 px IconButtons Previous, Play/Pause (solid black), Next and Full screen. |
| PHOTO-12 | **Photo details** sheet: eyebrow "Family photos", title "Photo details", a 2:1 preview (at most 160 px tall) with "File: {file name}" under it (15 px, one line, "…"), **Name** (required), **Date taken** (date field, no future dates), **Place**. Each field has a mono source caption: "From photo", "From photo location", "Guessed from file name", "Guessed from file date", "Guessed from place", "Not in photo", "File name"; a change reads "Edited" (typing back to the original isn't). Empty name → "Add a name"; a future date → "No future dates". Clearing the date saves "No date". Save updates the photo everywhere and syncs; offline it reads "Save for later". |
| PHOTO-13 | **Delete** (featured actions, ghost `trash-2`, hidden offline): pauses the slideshow and turns in place into a `danger` "Delete photo" and "Cancel"; moving to another photo cancels. Photo details keeps its own Delete with the same confirm. The photo (or the upload) leaves every list on every screen, the next photo takes its place, and its files are deleted. A deleted background photo turns the background back to Season color. `phdel=1` shows the confirm. |
| PHOTO-14 | **Full screen** (tap the photo or `maximize`, with at least one finished photo): black, above everything, photo uncropped. Top: mono "{n} of {total}", "Exit full screen" (`minimize`). Bottom: name, "{date} · {place}", Previous, Play/Pause, Next as 56 px `inverse` IconButtons. Tapping the photo hides or shows both rows (shown on open). The slideshow keeps its state. Esc exits, ← → step, Space plays/pauses. Closes on Exit, a view change or the idle timeout. A `dialog` named "{name} · full screen". |
| PHOTO-15 | **Set as background:** a ghost "Set as background" (`image`) under the featured photo's name. Tap → that photo becomes the fixed background on every screen (mode Photo, replacing Season color or Slideshow, dim kept) and the slideshow pauses. When the featured photo is already the Photo-mode background it reads "Background now · Change" (`check`) and opens the Background page. |
| PHOTO-16 | **Portrait photos** (taller than wide): thumbs, Today’s photo and backgrounds crop them like any photo; the featured photo shows them whole (contain, white bars at the sides, also for uploads measured on load); full screen always shows the whole photo. |

### 8.7 Settings & Background — `SET`, `BG`
Settings apply instantly, with no Save button. The main panel uses `Radio`, `Switch` and `Slider` (§4.2); Background and Ambient screen keep the large wrapping PillTabs. Sub-pages (Location, Background, Ambient screen) keep Settings active in the sidebar and put the ghost "‹ Settings" back link at the top left, above and outside the white panel, aligned with its left edge.

| ID | Requirement |
|---|---|
| SET-01 | Header "Screen settings", "Settings", "Signed in as **{name}** · {email}". |
| SET-02 | **Season:** a vertical list of radios, 56 px rows, left-aligned: Auto (`calendar-days`), Spring (`flower-2`), Summer (`sun`), Fall (`leaf`), Winter (`snowflake`), each radio, 20 px icon, label. "Follows the month · now {Season}" / "Fixed to {Season}". Auto re-checks at midnight. |
| SET-03 | **Background** row → Background page; summary "Season color" / "Photo · {title}" / "Slideshow · {interval}". |
| SET-04 | **Clock:** two radios on one line, "12-hour" and "24-hour" ("Used for every time on the screen"). |
| SET-05 | **Temperature:** two radios on one line, "Fahrenheit" and "Celsius", 24 px apart, never wrapping ("Weather is shown without a unit letter"). Then **Hide sidebar when idle:** a `Switch` on the right of the row, "After 15 seconds without a touch. Any tap brings it back." (SHELL-11). Last row. |
| SET-06 | Tile "Ambient screen" · its hours ("6:00 PM – 7:30 AM", "Sun – Thu 6:00 PM – 7:30 AM · Fri & Sat 9:00 PM – 9:00 AM", "Off"; a set with equal times reads "Not set") → SET-10. |
| SET-07 | **Back to Today after** and **Remove notes after:** each an eyebrow with a `Switch` on its right, then a white tile with the value (28 px / 340: "3 min" + "without a touch"; "7 days" + "after posting") and a `Slider` (1–15 min by 1; 1–30 days by 1) with mono end labels ("1 min" · "15 min"; "1 day" · "30 days"). Switch off = never: the slider is disabled, the value struck through, reading "Off · stays on the current view" / "Off · notes stay until deleted"; the last value comes back when it turns on. |
| SET-08 | Account card: block-4 initial, name, email, the screen list (SET-12), "Sign in another device" (SIGNIN-15), then below a hairline the note "Sign out this device only." (info icon, mono) on the left and "Sign out" on the right. |
| SET-09 | **Location** row, first: "Location" · "Sets the weather and the time zone" · "{city}, {state code} · {time zone name}" or "Not set" → **Location page** ("‹ Settings", white panel). Left: "Now set to" with the place and "{time zone name} · {clock}", or "Not set" · "Times follow this device’s own clock"; then "Change location" ("Set location" when unset) with the setup card (primary "Search") and its states. Right: soft block "What the location sets": Weather ("The forecast on Today, Weather and the ambient screen"), Time zone ("{zone} for the clock, Today, the calendar and event times"), a caption ("The clock and event times follow {zone}, even if this device is set to a different time." / "Until a location is set, times follow this device’s own clock.") and "Shared by every screen on this account". A place in the same zone saves and returns to Settings; another zone asks first (LOC-09). |
| SET-10 | **Ambient screen page:** "Schedule" Every night · Weekends differ · Off. Under it **Brightness** Full · Medium · Low (default Medium; AMB-06), shown when Off too since manual Ambient uses it, with "How bright the text is while dimmed. On screens that allow it, the backlight dims too." Weekends differ splits it into "Sun – Thu nights" and "Fri & Sat nights"; a night belongs to the day it starts, and a dim time before noon belongs to the night before. Modes keep both sets. Each set has TimeFields "Dims at" and "Wakes at" (with the length, past midnight when earlier); the picker has minutes 00 · 15 · 30 · 45. Equal times: "Same as dim time", the bar reads "Not set", and that set never runs. Off: "The screen stays bright all day and night.", right block "No ambient hours." / "Touch-to-wake and the idle timer work as usual." Right: "Over 24 hours", one noon-to-noon bar per set with the span dark, "After a touch it dims again when nobody has touched it for {n} min." (idle off → "After a touch it stays awake until the next ambient start."), and "Preview" (moon) → Ambient. |
| SET-12 | **Signed-in screens:** "{n} screens signed in" ("1 screen signed in"), soft rows: type icon (`monitor`, `tablet`, `smartphone`) in a white circle, name, mono caption "This screen" (first, with an accent dot) or "Active {n} min ago" / "Active {n} hr ago" / "Active yesterday" / "Active {Mon} {d}". Type from the browser that signed in: iPhone or Android phone → smartphone, iPad or Android tablet → tablet, else monitor. Name "{browser} {screen \| tablet \| phone}" (Chrome, Edge, Firefox, Safari), else "Screen", "Tablet", "Phone". Read-only. Read from the server when Settings opens; offline or on failure only this screen shows. |
| BG-01 | "‹ Settings", "Background", Season color · Photo · Slideshow. |
| BG-02 | 16:9 thumb grid (`auto-fill minmax(160px,1fr)`, 2 col on small) + "Upload photo" tile; uploads behave as PHOTO-06/08. Offline: "Upload when online", disabled. Label "Family photos · select one" / "Family photos · all {n} in rotation". |
| BG-03 | In Season color, thumbs are at 50%; tapping one switches to Photo. |
| BG-04 | Right: Preview (mini layout on the current background), "Dim photo" Off · Light · Strong (0, 0.2, 0.4), "Change photo" Hourly · Daily · Weekly (Slideshow only). |
| BG-05 | Caption: "Screens use a plain light gray background. Pick a photo to switch." / "{title} is the background on every screen. Panels stay solid on top." / "Showing {title}. The photo changes {interval}; panels stay solid on top." |
| BG-06 | Photo background = `linear-gradient(rgba(0,0,0,dim) ×2), url(photo) center/cover`, cross-fading 600 ms. Slideshow goes in upload order, the next photo at each local hour, midnight or Sunday midnight. A tapped thumb shows now and the rotation continues from it; mode or interval changes keep the photo on screen. Photo mode with none picked shows the oldest upload. |

### 8.8 Ambient — `AMB`
One full-screen button, text on deep. No sidebar and no wordmark; the rows spread over the full height.

| ID | Requirement |
|---|---|
| AMB-01 | Top row: `map-pin` + the location's place on the left (the season icon + the season's name when no location is set); on the right at most one status: "Signed out · tap to sign in" (`log-out`) wins over the offline notice (OFF-05). |
| AMB-02 | Giant Clock, `clamp(84px, min(19vw, 30vh), 300px)`. |
| AMB-03 | Weather: "{temp}° · {condition}" / "Low {low}° overnight · {day} {p}% rain" ({day} "Tomorrow" or "{Wkd}": the first of the next 6 days at ≥ 50%; none → the low alone); offline, "Updated {time}" under it. No location → no weather block. **Next event:** mono eyebrow "Next · Tomorrow · {start}" or "Next · {Wkd}, {Mon} {d} · {start}" (all-day reads "All day" and comes first), the title (24–40 px / 340, balanced wrap), then the location on its own line (17 px). None → eyebrow "Next event", "Nothing scheduled" and "Add events from Today" ("Add events and a location from Today" with no location). |
| AMB-04 | Bottom line "Tap anywhere to wake" ("Tap anywhere to sign in" when signed out), fading out over 1.2 s, 10 s after Ambient starts. A tap → Today (or the signed-out form). Named "Wake screen". |
| AMB-05 | Enters at the night's dim time and leaves at its wake time (only if Ambient is showing). Never when Off or "Not set". After a wake tap during hours it returns after the idle timeout; a screen that starts during hours gets there the same way. |
| AMB-06 | Background: season deep, or the photo background dimmed at least 0.6. **Brightness** (SET-10): text and icons are white (Full), `#dcdcdc` (Medium) or `#a3a3a3` (Low), solid colors, each at least 4.5:1 on every deep color. The backlight dims too only where the platform offers a way; browsers don't, so the text color is the whole effect today. `bright=full\|low`. |
| AMB-07 | Signed out during Ambient: it stays, with the signed-out status (AMB-01) and hint (AMB-04), the clock and saved weather; the next tap or the end of hours opens the signed-out form. |
| AMB-08 | The sidebar's Ambient item and SET-10 "Preview" open Ambient at once, outside the schedule too. |
| AMB-10 | **Transitions** (every way in and out, replacing the 280 ms fade). Entering: the current view dims to 25% brightness and scales to 98.5% (420 ms ease-in), then Ambient brightens in from 30% (700 ms ease-out) while its rows rise 16 px and fade in one after another (600 ms each, 120 ms apart, from 200 ms). Leaving: Ambient's rows fade out and lift 12 px (240 ms, 40 ms apart), then the next view brightens from 25% and 98.5% to full (520 ms). Taps during either transition are ignored. Reduced motion: switches at once. |
| AMB-11 | **Burn-in drift:** the four rows move together to the next of 8 offsets (each at most 6 px from the rest position on either axis) every 2 min, over 2 s ease-in-out; with reduced motion they jump at once. |

### 8.9 Sheets — `SHEET`
- Modal over a 60% scrim (also over the sidebar). Card radius 32, max width 560, padding `clamp(24px,3vw,40px)`, shadow-3, 56 px close button. Note sheets have their own shape (NOTE-02, NOTE-10).
- **Sticky header and footer** (every sheet): the eyebrow, title and ✕ stay pinned at the top while the body scrolls, and the footer at the bottom. Both are white; the header casts `0 2px 8px` 4% black down onto the body and the footer the same up (`0 -2px 8px`); the body between them is surface-soft (`#f7f7f5`), 12 px below the header. In the body, tiles and pills that were soft are white (time picker, New member tile, suggestion pills, Who pills in Event details); inputs stay white with a hairline. Note sheets keep the paper tone everywhere.
- Note sheets (details, New note, Edit note) show no shadow under the sticky header or above the sticky footer.
- An unchanged sheet closes at once on scrim, Cancel, ✕ or Escape.
- **Discard changes?** When the draft changed, those replace the footer with "Discard changes?", a line ("This event won’t be added." · "Your edits to this event won’t be saved." · "This note won’t be posted." · "Your edits to this photo won’t be saved."), secondary "Keep editing" (focused) and `danger` "Discard". While shown, the scrim is ignored and ✕ or Escape discards. An edit or "Keep editing" brings the footer back. The idle timeout discards without asking.
- Sticky action row: Delete left, Cancel + primary right. Event details has a single primary "Edit"; Note details Delete and Edit; the note composer has no Cancel (NOTE-05).
- Offline banner "You're offline": event "Changes save on this screen and sync when the connection is back."; note "The note saves on this screen and posts when the connection is back."
- Focus is trapped; opening focuses the sheet itself (no keyboard pops up), closing returns focus to the opener.

---

## 9. Cross-cutting behavior

### 9.1 Time — `TIME`
- TIME-02: the clock ticks every second, status every minute; Season Auto re-checks at midnight.
- TIME-03: one injectable `now` source.
- "Local" always means the screen's time zone (LOC-06).

### 9.2 Idle — `IDLE`
- IDLE-01: while "Back to Today after" is on (SET-07), after no touch for the chosen minutes, any view returns to Today; sheets are discarded and full-screen Photos closes; the sidebar is Hidden (SHELL-11). A tap, key press or scroll counts as a touch.
- IDLE-02: paused while a text field is focused; leaving it restarts the wait.
- IDLE-03: during ambient hours, idle returns to Ambient.

### 9.3 Loading — `LOAD`
- LOAD-01: each source loads on its own; clock and season never wait.
- LOAD-02: skeletons keep the final shape and pulse 1.2 s, only when nothing is saved yet.
- LOAD-03: over 10 s (from screen open; weather from its fetch) → that zone's failure. Before the first sync the weather loads rather than asking for a location.

### 9.4 Failure (online) — `FAIL`
- FAIL-01: only the failing zone changes: icon, "{Source} unavailable", "The Glance server isn’t responding. Trying again in {n} min." (weather: WX-05), "Try again". On a calendar failure the Now panel shows the clock and weather only. Ambient's failed zones stay blank.
- FAIL-02: with saved data, keep showing it and add "Updated {time}".
- FAIL-03: retry after 1, 2 and 5 min, then every 5 min.

### 9.5 Offline — `OFF`
- OFF-01: black pill bottom-left, 24 px up, at the gutter plus the sidebar inset: wifi-off "Offline · showing saved data" + "Saved {time}" (time hidden on small and on Weather). Appears after 30 s offline.
- OFF-02: saved data stays; statuses keep updating.
- OFF-03: weather over an hour old shows the "Forecast from" banner (WX-03).
- OFF-04: edits queue locally; sheets show the offline banner and "Save for later"; new notes read "Waiting to post" until sent.
- OFF-05: Ambient shows the notice in its top row (white 16 px mono).
- OFF-06: **Cold start offline:** a signed-in screen opens from saved data with every view working, including photos it never displayed.
- OFF-07: **Updates** apply only while idle (Ambient, or Today after the timeout) with nothing waiting to sync; the screen reloads once. If the server rejects this version, the update applies at the next idle anyway and the waiting changes are kept.

### 9.6 Keyboard — `KB`
- KB-01: use the OS keyboard, sized from `visualViewport`.
- KB-02: sheets shrink above the keyboard (280 ms) and scroll inside; actions stay sticky.
- KB-03: full-page forms (Sign in email, name, location, Weather setup, Location card) pad by the keyboard and scroll the focused field 24 px below the top.
- KB-04: Return moves to the next field; Message adds a line; in the last field it submits a full-page form, or hides the keyboard in a sheet.
- `kb=1` fakes the keyboard height (36% of the window, 260–380 px) and focuses the first field; the drawn keyboard isn't built.

### 9.7 Sync — `SYNC`
- SYNC-01: events, tags, notes, photos and settings are saved to the account and sync to every screen. The Calendar filter, 24 hours and the selected day belong to the tab.
- SYNC-02: writes go to IndexedDB with an outbox entry; the engine pushes them in order and pulls changes since its cursor; an SSE ping triggers a pull, else polling every 30 s. A pull never overwrites a row with a pending write (tech design §5).
- SYNC-03: last write to reach the server wins; offline edits replay in order. **Delete wins** over a concurrent edit. Settings are one record: the later change replaces the whole set.

### 9.8 Accessibility — `A11Y`

| ID | Requirement |
|---|---|
| A11Y-01 | Every control has a name. Meaningful icons without text are named images (hourly and 7-day icons by condition); decorative icons are hidden. |
| A11Y-02 | Choices use `aria-pressed`: swatches, PillTabs, week and date picker days, tag pills (filter) and suggestions, radios (`aria-checked`), switches (`role="switch"`), picker cells, thumbs, active IconButtons. |
| A11Y-03 | Sheets are `role="dialog"` + `aria-modal`, named by their title. Targets ≥ 44 px (rail 56, drawer rows 64, grip 44×144, handle 56×96; sheet close and upload buttons 56). |
| A11Y-04 | Sheet focus follows the visual order: ✕ → fields → swatches → actions, wrapping. |
| A11Y-05 | Hierarchy by weight, never opacity. WCAG AA 4.5:1 everywhere: black on season blocks, soft surfaces and panels; white on deep and Winter's accent; **black on the Spring, Summer and Fall accents**; white over the Ambient photo at dim ≥ 0.6; the three Ambient brightness colors on every deep color. |

### 9.9 Location and time zone — `LOC`
One US place per account sets the weather and the screen's time zone for every screen. The setup card appears in Weather (WX-04), Settings › Location (SET-09) and the first sign-in (SIGNIN-14).

| ID | Requirement |
|---|---|
| LOC-01 | **Use my location** (locate icon), only when the browser can locate on a secure page and permission isn't blocked. The place found is saved like a single match. |
| LOC-02 | **Locating:** the buttons become "Finding where this screen is…" · "If the browser asks, choose Allow." with a pulsing icon (a status). The permission prompt isn't timed; then 10 s for the position (low accuracy, up to 10 min old) and 5 s for the lookup. Typing, leaving or "Skip for now" cancels. |
| LOC-03 | **Failures** return to the card with the draft kept, as a soft row with an icon under the field, cleared on the next keystroke. Denied (map-pin-off): "Location is off for this screen. Type a city or ZIP instead." and the button hides. No position (locate-off): "Couldn’t find where this screen is. Try again, or type a city or ZIP." Outside the US (globe): "This screen seems to be outside the US. Glance works for US places only. Type a US city or ZIP." Lookup failed or offline (search-x): "Couldn’t look up this place. Try again, or type a city or ZIP." |
| LOC-04 | The server turns the position (rounded to 2 decimals) into a city or named area, state and time zone. No US state = outside. |
| LOC-05 | Every saved place carries its IANA zone; search results without a valid zone are left out. |
| LOC-06 | **Screen time zone:** every time and date on screen uses the location's zone, else the device's, even if the device clock is set elsewhere. A skipped DST time moves forward by the gap; a repeated one is the first. |
| LOC-07 | Server rules that need a local day (a photo's upload-day date) use the location's zone, else `accounts.time_zone`. |
| LOC-08 | **Zone names:** "{Name} time": Eastern, Central, Mountain, Arizona, Pacific, Alaska, Hawaii, Atlantic, Chamorro, Samoa. No abbreviations, offsets or IDs. Other zones (a device zone outside the list) use the browser's long generic name, "Central European time". Shown only in the Settings summary, the Location page, LOC-09 and WX-09 rows. |
| LOC-09 | **Zone change confirm** (Settings › Location only, when a zoned place exists and the new zone name differs): highlight block "Time zone change", "Switch to {new} time?", "{place} is in {new} time. The clock moves {n} hours {ahead\|back}, and event times change to match on every screen." ("1 hour"), tiles "Now · {old} time {clock}" and "After · {new} time {clock}", and "{title} at {time} will show at {new time}." for the next timed event (none → no line). Same time today but not all year: "The time is the same right now, but it can differ later in the year." Primary "Switch to {new} time" saves and returns; secondary "Keep {old} time" returns to the card. |

---

## 10. Copy
All user-facing strings live in `src/copy.ts`, except time formats (TIME-01) and zone names (LOC-08), which `domain` formatters build. Strings are exact as written in §8–9, with apostrophes always typographic (’) in `copy.ts`. Use short words, "screen" not "display", nothing that assumes an office; name time zones the family way (LOC-08).

---

## Appendix A — Fixture data
Frozen at **Fri Oct 9 2026, 10:41 AM Pacific** (Ambient 7:12 PM). Fixture times are Pacific wall times, and a `now=` without offset is read in that zone. Account maria@example.com, name "Maria"; any other email is new. Sign-in code: `000000` is wrong, any other 6 digits are right. Location "Portland, OR · Pacific time".

**Tags:** Minh-An (lilac), Minh-Hy (sky), Mom (coral), Dad (mint), Thang (sun), Tin (pink), Nghe (lime), An (rust), Nga (glacier), in that order.

**Events (Oct 2026):** ported from the prototype's `Component.init()` list; plans listing all nine tags are stored as everyone, and "Bring …" lists become Notes. The 9th has 18 timed plans from Morning run 7:00 AM (Thang) to Movie night 7:00–8:30 PM (everyone), with School 8:15 AM–3:00 PM (Minh-An, Minh-Hy), Yoga class 10:00–11:00 AM (Nga) and Grandma's video call 10:30–11:15 AM (Mom) running at 10:41; the event summary shows the video call. The 10th adds Pick up bait 4:30 AM and Late movie 10:00 PM (24 hours). The 16th has the all-day "No school · teacher planning day". School weeks (5th–8th, 12th–15th) have drop-off, School and pickup. `allday=1` adds Grandpa staying over (everyone, all day) on the 9th. `events=many` adds Family dinner, Bedtime story, Call the plumber and Walk the dog on the 9th (22 plans).

**Notes:** "Wi-Fi password is on the fridge!" Dad 8:12 AM (−2°) · "Package for Minh-Hy at the front door." Mom 9:05 AM (1.5°) · "Window cleaner comes Wednesday — please leave blinds up." Mom Mon (−1°) · "Welcome home, Grandpa!" Minh-Hy Tue (2.5°) · "Bike lock code changes Friday. Ask Dad." Dad Tue (−1.5°). Keyboard-frame draft: "Has anyone seen my blue umbr".

**Weather (°F):** now 64 Partly cloudy, H 68 / L 51, feels 62, wind 8 mph NW, humidity 62%, UV 3, sunset 6:42 PM. Hourly 11 AM–6 PM: 64, 66, 67, 68, 65, 61, 58, 56. Daily: Today 68/51 20% · Sat 59/48 80% · Sun 61/47 30% · Mon 66/49 · Tue 69/50 · Wed 65/50 10% · Thu 58/46 70%. Ambient: 56° Light rain, "Tomorrow 80% rain".

**Places:** "Portland" → Portland, OR (Pacific) / Portland, ME (Eastern); "Springfield" → IL, MO (Central) / MA (Eastern). Any 5-digit ZIP or query with a comma is one place in the fixture zone; anything else is unknown ("Pordland"). Use my location finds Portland, OR after 2.6 s. `wx=tz` moves Portland, OR → Portland, ME (3 hours ahead; "Volunteer shift at 11:00 AM will show at 2:00 PM.").

**Photos:** Apple picking (Sep 27, Sauvie Island) · Pumpkin patch (Oct 4, Family outing) · Cannon Beach (Sep 6, Summer trip — the `bg=photo` background, and Today’s photo on Oct 9 otherwise) · First day of school (Sep 2, Lincoln Elementary) · Bike ride (Aug 30, Waterfront) · Forest Park trail (Aug 22, Weekend hike). Uploaded the evening of Oct 4 in the order Forest Park trail, Bike ride, First day of school, Pumpkin patch, Apple picking, Cannon Beach, so the first cycle lands Cannon Beach on Oct 9. All checked. Bundled images, so the app works offline. `upload=done` adds two unchecked uploads from Oct 9: `halloween-costumes-2025-10-31.jpg` → Halloween costumes, Oct 31 2025, no place (`sheet=photo`); `IMG_4410.JPG` → Cannon Beach, Aug 16 2026, Cannon Beach, OR (`sheet=photometa`). `upload=error`: "IMG_3307" too large, "Recipe card" not a photo, "Halloween costumes" network failure.

**Screens (SET-12):** Chrome screen (this screen) · Edge screen (12 min ago) · Safari tablet (yesterday) · Safari phone (Oct 2): "4 screens signed in". Offline, only this screen.

**Signed out:** last email maria@example.com; `pending={n}` sets the waiting changes; `switch=1` enters sam.lee@example.com.
