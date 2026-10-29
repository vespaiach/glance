# Glance — Product Specification

| | |
|---|---|
| Status | v1.15 |
| Date | 2026-10-28 |
| Technical design | [`tech-design.md`](tech-design.md) |
| Source of truth | [`Glance.dc.html`](design/handoff/Glance.dc.html) (prototype) · [`Glance Notes.dc.html`](design/handoff/Glance%20Notes.dc.html) (behavior) · the `Glance States - …` pages (index: [`Glance States.dc.html`](design/handoff/Glance%20States.dc.html)) · [`Glance New Event.dc.html`](design/handoff/Glance%20New%20Event.dc.html) (the event page) and the other pages in §2 |

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
Calendar sync (Google/Outlook) · recurring events other than weekly, multi-day events · renaming or recoloring tags · note moderation · photo albums · weather alerts, forecast-day detail · places outside the US, more than one location per account, per-screen locations · guided setup, renaming screens or signing out one other screen · roles and permissions · changing the account name or email · session expiry, kiosk lock · reminder dismiss, snooze, per-person reminders and per-event lead times (NOTIF-10).

### 1.3 Open questions
None.

---

## 2. Sources and overrides

The **prototype** (`Glance.dc.html`) wins on layout, copy, states and component use, and **`Glance Notes.dc.html`** on behavior. Glance Notes wins over the handoff README and the side pages, then comes the design-system readme. The side pages: the **States pages**, one per feature, with the states and variants at the three sizes (their frame letters are stable references; `Glance States` is only their index): `Glance States - Account` (sign in, Scan to sign in, the sign-in email), `- Today`, `- Calendar`, `- Weather`, `- Notes`, `- Photos`, `- Settings` (Settings, Background, photo storage, Delete account, Remove a member, Location, Ambient screen, Ambient), `- System` (loading, offline, keyboard, the small drawer) and `- Components` (the component library); then `Glance New Event` (the event page, EVT-*; the prototype mounts it, and its `size` and `mode` props show every size), `Glance Phone Calendar & Events` (small Calendar), `Glance Notifications` (NOTIF-*), `Glance Terms of Service` (TERMS-01) and `Glance Guide` (GUIDE-01). Only the prototype's defaults are built: the left sidebar with the Rail handle (no bottom bar), Today's Now panel layout, Calendar's day timeline, the avatar-stack person filter and the notes' "{n} more notes" row. The sidebar is checked against the prototype; everything else against the feature's States page (the event page against `Glance New Event` and the prototype URLs `sheet=newevent|event|allday|past` and `details=1`) at large 1920×1080, normal 1024×768 and small 390×844.

**Settled conflicts:**
- Today’s photo frame is capped at `25dvh − 24px` on large, none on normal and small (TODAY-07); the prototype has no cap.
- The event page scrolls as a whole under its sticky task bar (EVT-01, EVT-05), as the mockup and the v19 task bar note show, not Glance Notes' older "The page never scrolls" lines.
- The event page's ✕ with changes asks "Discard changes?" in the task bar, and from Event details ✕, Discard and Save return to details (EVT-05), not Glance Notes' "× always closes at once".
- One reminder per event, at the lead time only: no reminder at the start (NOTIF-01, NOTIF-03, NOTIF-04, NOTIF-07); Ambient's Next slot still reads "Now · {start} – {end}" while the event runs (NOTIF-06).
- New members are still added from the event page's Who picker (EVT-11, FAM-04), which Glance Notes leave without an entry point.
- The event page keeps the 24-hour Clock and the offline "Save for later" label (TPK-09), which Glance Notes leave out.
- Photo storage is 5 GB per account by default and set per server (SET-13), not a fixed constant.
- Sign in another device's code lasts 3 minutes (SIGNIN-15), not the 5:00 in Glance Notes.

Where Glance departs from the design system:

| Topic | Glance does |
|---|---|
| Navigation | Left sidebar (SHELL-08), no bottom bar, no Ticker |
| Canvas | Light grey `--hairline-soft` canvas behind white panels, so one layout works on season color and on a photo |
| Backgrounds | Season color, Photo or Slideshow, with dim. Text zones sit on white panels |
| Brand | "Glance", plain Geist 540, no logo |
| Type | Smaller fluid `clamp()` sizes (§4.3). Mono captions 14 px minimum (16 on Ambient). Text is black on light surfaces and white on black or deep ones; never gray or dimmed by opacity. Only Ambient's Medium and Low brightness use solid light grays (AMB-06) |
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
- Icons: Lucide 1.61.0, stroke 1.75 (1.25–1.5 at ≥ 48 px). Fonts: Geist and Geist Mono variable 100–900, self-hosted.

---

## 4. Design system

### 4.1 Tokens and seasons
The handoff tokens (`docs/design/handoff/_ds/…/tokens/*.css`) are ported verbatim as StyleX vars in `src/theme`. Season palettes: `seasons.css`; season icons: the prototype's Season setting. Season roles: **block-1 = Now panel, block-3 = weather, block-4 = highlight**, soft = warm neutral and the notes' paper, deep = Ambient, accent = alerts (at most one accent action per screen). A season change cross-fades (§4.4).

### 4.2 Components
Typed components in `src/ui` (the calendar controls in `features/calendar/components`), styled with StyleX only; most take an optional `xstyle`. Words come in as props. Appearance: see `Glance States - Components` and the tokens file.

| Component | Notes |
|---|---|
| `Clock` | Tabular numerals, date line "Friday, October 9". The colon blinks every 0.6 s, and stays on with reduced motion. Takes the time from the screen; no timer of its own |
| `DayTimeline` | The elastic day timeline (§8.3.2): hour gutter with hour weather, plan cards, long-plan strips, the "+N MORE" tile, free slots, now marker, rain chips (Calendar) |
| `WeekStrip`, `CalendarHeader`, `DayList`, `DatePicker` (calendar feature) | CAL-01, CAL-02, CAL-10, CAL-03. Day buttons named by the full date; selected `aria-pressed`, today `aria-current="date"` |
| `WhoStack`, `WhoSheet` | CAL-05, TODAY-04: the person filter's avatar stack and its "Show plans for" modal |
| `MonthGrid` | The design system's month grid, in the small date picker only (CAL-03) |
| `PersonDot` | A tag's color dot. Plan cards build their dot rows and Who suggestions their pills from it |
| `Button` | Pill. Variants primary, secondary, ghost, accent, inverse, **danger** (the same in every season: delete and discard confirms) |
| `IconButton` | Sizes `md`, `touch`, `lg`; `active`; `current="page"` |
| `PillTabs` | Segmented control, a group of `aria-pressed` buttons. `lg` wraps onto more rows |
| `Radio`, `Switch`, `Slider` | §8.7. Radio: 56 px tap height. Switch: `role="switch"`. Slider: mono end labels; a disabled state |
| `CodeField` | SIGNIN-04: six cells over one numeric input |
| `TextInput` | Focus ring, error below, optional mono caption right of the label, `type="date"` |
| `ColorBlock`, `Card`, `Banner`, `Eyebrow`, `Icon` | As in the design system. Blocks are never shadowed |
| `WeatherNow`, `ForecastDay` | Values arrive in the display unit; no unit letter |
| `StickyNote`, `NoteComposer` | On the paper tone (§8.5); the composer is NOTE-02 |
| `TimeField`, `TimePicker` | Ambient screen times (SET-10): a button named "{label}, {time}. Change" that opens a picker tile below it: a sliding AM/PM toggle (12-hour only), then "Hour" and "Minutes" rows of pill cells, one at a time, closed by tapping the field again or "Done" |
| `EventTaskBar`, `EventSentence`, `EventPicker` | The event page's task bar, sentence card and picker card (EVT-*, TPK-*) |
| `Skeleton`, `EmptyState`, `SourceFailure`, `Zone` | §9.3–9.4. `Zone` renders loading / empty / ready / failed in its own error boundary |
| `Sheet` | §8.9 |
| `ColorSwatchPicker` | Round swatches named by color. Tags use the 12 tag colors; notes have none |
| `OfflinePill`, `SettingsRow`, `AllDayTile` | OFF-01, §8.7, TODAY-12 |
| `BackLink`, `DiscardPrompt`, `PhotoBackdrop`, `QrCode` | §8.7 "‹ Settings" link, "Discard changes?" (§8.9), photo background (BG-*), SIGNIN-15 and "Add from your phone" QR (PHOTO-03) |
| `ReminderStrip`, `Toast`, `Dialog` | NOTIF-03; the black pill toast at the bottom center (SIGNIN-11, SET-14); the centered confirm dialog over the scrim (SIGNIN-11, SET-14) |

**DS-01:** `/dev/gallery` (dev server only) shows every component in all 4 seasons and every state the States pages show, at the three sizes.

### 4.3 Fluid type and gutters
Type sizes and the gutter are the prototype's overrides of the design-system tokens (smaller fluid `clamp()` sizes, and Ambient's own clock and eyebrow sizes), ported in `src/theme`. Today's type grows past 1920×1080 (TODAY-14).

### 4.4 Motion and feedback
- Touch first: no hover states. Press scales down. Fills never darken. No bounces, no blur. Durations and curves: the tokens file (`--dur-*`, `--ease-*`, `--press-scale`); to and from Ambient: AMB-10. The keyboard resize takes 280 ms.
- **Reduced motion:** screen changes, slides, the season and background cross-fades and the keyboard resize happen at once. Press, tab and tile feedback stay.

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
- Season theme, background = season canvas or photo layer (BG-06). `<main>` scrolls, padding = gutter, 16 px at the bottom.
- **SHELL-01 Nav:** a left sidebar with seven items in a `nav` named "Main": **Today** `house`, **Calendar** `calendar-days`, **Weather** `cloud-sun`, **Notes** `sticky-note`, **Photos** `image`, then pinned to the bottom **Ambient** `moon` (named "Ambient screen") and **Settings** `settings`.
- **SHELL-02:** the active view is black with `aria-current="page"`. Settings stays active on its sub-pages. Ambient is never active: it opens the Ambient screen at once (AMB-08).
- **SHELL-03:** no sidebar on Sign in, Ambient, Terms of Service and the Guide; the page takes the full width.
- **SHELL-04:** changing view closes any open sheet and scrolls `main` to the top.
- **SHELL-05:** on a photo background every zone with text sits on a white panel. Color blocks and the sidebar stay solid.
- **SHELL-08 Sidebar states.**
  - **SHELL-08a Transitions:** Hidden → Rail → Expanded → Hidden, plus Rail → Hidden with the rail's ✕.
  - **SHELL-08b Start and view changes:** a load on Today starts Hidden, on any other view Rail. Opening any view but Today brings the Rail back; going to Today leaves it as it is.
  - **SHELL-08c Small transitions:** on small there is no Rail: Hidden ⇄ Expanded only, and any view change returns to Hidden.
  - **SHELL-08d Not saved:** the state belongs to this tab and isn't saved.
  - Sizes, shadows and placement: the prototype's sidebar (§2); small: see `Glance States - System`, Small-screen drawer, frame A.
  - **SHELL-08e Hidden:** the grip, a tab flush with the left edge with a `chevron-right`, in a 44×144 touch area, with press feedback: "Show sidebar" → Rail. Every view, Today included, keeps a left inset the grip's width while Hidden, so the grip never covers content.
  - **SHELL-08f Rail:** full height: the five views as IconButtons, a flexible gap, Ambient and Settings, then a ✕ "Hide sidebar" as a fixed footer (the items above scroll on short windows). **Expand handle:** on the rail's inner edge, vertically centered, a 56×96 touch area, "Expand menu" → Expanded. It fades out while the drawer is open and in full-screen Photos.
  - **SHELL-08g Expanded:** a floating panel, no scrim. Header "Glance". The five views as pill rows (icon + label; current = black fill), a gap, a hairline, Ambient and Settings, then a fixed "Close" row (named "Close sidebar") → Hidden. The rail fades out. The page is pushed aside and stays usable: a tap on it doesn't close the drawer. Picking a row, or any view change, returns to Rail.
  - **SHELL-08h Small (≤ 768):** no Rail. The page takes the full width with only the grip ("Open menu") on the edge; it opens the Expanded drawer directly, and closing it (Close, scrim or picking a view) returns to the grip. The drawer slides **over** the page with a scrim; a scrim tap closes it and focuses the grip.
  - **SHELL-08i Motion:** the sidebar slides; at once with reduced motion.
- **SHELL-09 Keyboard and focus:** the grip and Expand menu carry `aria-expanded`. Escape in Expanded → Rail. Opening the drawer focuses the current view's row. Escape or a row → focus to Expand menu; Close or ✕ → the grip; the grip → Expand menu. A view change that brings the rail back, and a page load, move no focus. Parts not shown are `inert`. No focus trap.
- **SHELL-10 Offsets:** the sidebar's inset for its state (the grip, the rail or the drawer and its margin; on small only the grip, as the drawer overlays the page) pads the shell, so the views and the offline pill follow it. Sheet scrims and full-screen Photos cover the sidebar.
- **SHELL-11 Hides when idle** (when `hideSidebarWhenIdle` is on, SET-05): after 15 s with no touch or key press, Rail or Expanded → Hidden (the drawer closes and the rail slides away). The timer doesn't run while a sheet is open, the keyboard is up or a text field is focused. Tapping the grip → Rail and restarts the 15 s. No focus moves. Off: the sidebar stays as it is.

### 5.3 Grid templates
Each view's columns are the prototype's layout for that view; see the feature's States page. Today: TODAY-14. Calendar: the week strip then the day (CAL-04); small: the header card then the day list (CAL-02, CAL-10). Photos fits the screen on large and normal.

### 5.4 Small (≤ 768)
- One column everywhere. The hourly and 7-day forecast rows scroll sideways.
- Today: the compact Now panel with no Clock (TODAY-01), and the day list as the schedule (TODAY-11).
- Calendar: the header card and the day list (CAL-02, CAL-10); no timeline, 24 hours link or rain chips.
- Photos: Upload opens the file picker; no QR panel (PHOTO-03).
- The note composer opens full screen (NOTE-02); the event page has no day preview and no Same time line, and its time grids are 6 across (EVT-13, TPK-03).
- No rail: the grip opens the drawer over the page (SHELL-08).

---

## 6. Routes

| Route | View |
|---|---|
| `/signin` | Sign in |
| `/` → `/today` | Today (`?event={id}` opens Event details; `?at={HH:MM}`, a reminder group's push, shows Today; NOTIF-07) |
| `/calendar` | Calendar (`?date=YYYY-MM-DD`) |
| `/weather` · `/notes` | Weather · Notes |
| `/photos` | Photos (`?photo={id}`, PHOTO-01) |
| `/settings` · `/settings/background` · `/settings/location` · `/settings/ambient` | Settings · Background · Location (SET-09) · Ambient screen (SET-10) |
| `/ambient` | Ambient |
| `/terms` | Terms of Service (TERMS-01; public, no sign-in, no sidebar) |
| `/guide` | Guide (GUIDE-01; public, no sign-in, no sidebar) |
| `/dev/gallery` | Component gallery (DS-01; dev server only) |

---

## 7. Domain model

```ts
type Tone = 1 | 2 | 3 | 4 | 'soft' | 'accent';       // season swatch tones
type Season = 'spring' | 'summer' | 'fall' | 'winter';
type Synced<T> = T & { updatedAt: string; version: number; deletedAt?: string };  // stamped by the server

type TagColor = 'lilac' | 'sky' | 'coral' | 'mint' | 'sun' | 'pink' | 'lime' | 'rust'
              | 'glacier' | 'amber' | 'sage' | 'ice';  // the design system's block colors; never change with the season

interface Tag {      // a person; created from an event's Who picker, removed from Settings (FAM-08), never renamed or recolored
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
  notify?: boolean;    // NOTIF-09: the event's Notification; missing = on. Ignored for all-day events
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
// Image URL: /api/photos/{id}/file?v=display|thumb

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
  notifyLead: 'off' | 15 | 30;                    // NOTIF-08: minutes before each event; off = no reminders for anyone
  chime: boolean;                                 // NOTIF-05
  weatherLocation?: { name: string; region: string; lat: number; lon: number; timeZone?: string };
}

interface Account { id: string; email: string; name: string | null } // name null until SIGNIN-06
interface Display { id: string; accountId: string } // kind, browser and lastSeenAt are server columns, read through the screens list (SET-12)
```

**Defaults:** season Auto, 12-hour, °F, background Season color (dim Light, rotate Daily), idle on · 3 min, notes on · 7 days, hide sidebar when idle on, ambient Every night 6:00 PM – 7:30 AM (weekends 9:00 PM – 9:00 AM), ambient brightness Medium, notifications 15 min before, chime on. Push is on or off per device, never in settings (NOTIF-08). Photo storage: SET-13.

**Account model:** one family = one account = one email. Sign-up and sign-in are the same email-code flow (SIGNIN-12). Events, tags, notes, photos and settings belong to the account; a display is one signed-in screen with no settings of its own.

**Tags** are the family's people: a name with a color that marks events; they never sign in. They work like tags: there is no list to manage, a tag exists because an event's Who picker created it (FAM-04), it can be removed from Settings (FAM-08), and tags are never renamed or recolored. A new account gets one tag named after the account (SIGNIN-06), with the first color. An event's people are **everyone** (the flag, set when every tag is on it; a tag added later joins it), a set of tags, or **nobody**; "who" reads "Everyone", the names in tag order joined by ", ", or nothing. An event's color: one tag → that tag's color; more than one, everyone or nobody → the season soft color with person dots (no dots for everyone or nobody).

### 7.0 Database
The tables and storage rules: [tech-design §6.7](tech-design.md#67-database).

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
Layout: left = block-1 hero: "Glance" wordmark; top right the date and time ("Tuesday, October 20 · 10:41 AM", follows the clock setting; small "Tue, Oct 20") and the season icon (no season text, no Clock); headline "Your family’s day, at a glance."; body "Calendar, weather, notes and photos for your family. Sign in to manage them."; then a static, non-interactive preview of an events tile, a weather tile and a sticky note (see `Glance States - Account`, frame A). The note sits with the weather tile: under it beside the events tile on wide heroes, side by side below the events tile when the hero is narrow. No preview on small. Right = form, with the lock footer "Only your family can see its calendar, notes and photos." and the Terms line (SIGNIN-19) in every form state. Sign-in happens on the screen that asked for the code (there are no email links), or by scanning a signed-in screen's code (SIGNIN-15, SIGNIN-20).

| ID | Requirement |
|---|---|
| SIGNIN-01 | **Email form:** eyebrow "One account per family", title "Sign in or get started", body "Enter your email. We’ll send a 6-digit code to sign this screen in. New here? The same code sets up your family’s Glance." Field placeholder `name@example.com`, primary "Send code" (→ icon). |
| SIGNIN-02 | Invalid email → "Enter a valid email address", cleared on the next keystroke. |
| SIGNIN-03 | **Sending:** "Sending…" disabled, email locked, a tile "Sending a code to {email}" with a mail icon (see `Glance States - Account`, frame B) → Enter the code. A failed send returns to the form with the email kept and "Couldn’t send. Try again." under the field (clears on the next keystroke). |
| SIGNIN-04 | **Enter the code** (the same for new and known emails): eyebrow "Sign in", title "Enter the code", body "We sent a 6-digit code to **{email}**. It works once, for 10 minutes." `CodeField` labelled "Code": six cells (see `Glance States - Account`, frame D) over one input (`inputmode="numeric"`, `autocomplete="one-time-code"`, max 6); non-digits and spaces are dropped, so pasting "482 913" works; the next empty cell has the focus ring while focused; focus lands in it when the step opens. Primary "Sign in" is disabled until 6 digits are in; the 6th digit submits on its own. Checking: "Checking…", field locked. Below a hairline, ghost "Send a new code" and "Use a different email" (email kept); for 10 s after each send both are replaced by a timer "New code or different email in 0:10" … "0:01"; a new send restarts it. "Send a new code" → Sending → Enter the code. |
| SIGNIN-17 | **Wrong code:** the field clears, every cell turns red, "That code isn’t right. Try again." in the TextInput error style, cleared on the next digit. The 5th wrong try kills the code: "Too many tries. Send a new code.", field disabled, and both ghost buttons show at once. |
| SIGNIN-06 | **"What's your name?"** on this screen, only for a new account: eyebrow "New family account", body "This is the first sign-in for {email}. Your name shows in Settings." Field "Your name" ("First name is fine"), primary "Continue" → SIGNIN-14. Empty → "Add your name". The server accepts at most 100 characters. Continue is disabled while saving; a failed save shows "Couldn’t save. Try again." |
| SIGNIN-08 | **Expired** (10 min on Enter the code): "This code has expired" · "Codes work for 10 minutes. Send a new one to {email}." + "Send a new code", "Use a different email". |
| SIGNIN-09 | **Signed in:** check icon, "Signed in", "Welcome, {first name}" (new) or "Welcome back, {first name}", "Opening Today…"; Today opens after 2.2 s ("Opening Photos…" and Photos for a PHOTO-03 code). After the right code: setup done → this step; no name → SIGNIN-06; location step unfinished → SIGNIN-14. |
| SIGNIN-10 | **Offline form:** banner "You're offline" · "A code can't be sent right now. Sending turns back on when the screen reconnects." Send disabled, email still editable. **Offline on Enter the code:** the code can still be typed; banner "You're offline" · "The code can't be checked right now. Sign in turns back on when the screen reconnects." Sign in and Send a new code are disabled and nothing submits until reconnect. |
| SIGNIN-11 | **Sign out** (Settings › Account, SET-08). |
| SIGNIN-11a | **Dialog:** Sign out opens a centered `Dialog` over the scrim (the prototype's Sign out dialog; a scrim tap, Escape or Cancel closes it): a `log-out` icon disc, the signed-in email as eyebrow, title "Sign out", body "Sign out of this screen only, or of every phone, tablet and screen signed in with this email. Calendars, notes and photos stay saved to the account." Three stacked buttons: secondary "Sign out this device", primary "Sign out all devices" (`monitor-smartphone`), ghost "Cancel". |
| SIGNIN-11b | **This device:** only this screen signs out, other screens stay signed in; changes not yet synced on this screen are discarded. |
| SIGNIN-11c | **All devices:** the server ends every session, Sign in another device code and push subscription of the account (the other devices: SIGNIN-18), then this screen signs out too and shows the `Toast` "Signed out of all devices." for 4 s. |
| SIGNIN-11d | Both land on the empty email form. |
| SIGNIN-11e | **Offline and failure:** offline, "Sign out all devices" is disabled; a failed request keeps the dialog open with "Couldn’t sign out. Try again." under the buttons. |
| SIGNIN-12 | **Codes:** one code signs up or in: an unknown email creates the account when its code is entered. A code is 6 digits, works once, for 10 minutes, and allows 5 tries; a new code voids older ones. The responses never reveal whether an account exists. **Email** (HTML with a plain-text part; source `docs/design/handoff/emails/sign-in-code.html`, the same for new and known emails): subject "Your Glance sign-in code", preheader "{code} is your Glance code. It works once, for 10 minutes." Header "Glance"; a hero in the season's colors (the account's fixed season, else the send date's) with eyebrow "Sign-in code", title "Your sign-in code", "Enter this code on the Glance screen that asked for it. New here? The same code sets up your family’s Glance.", the code, and "Works once, for 10 minutes"; a card "Glance never asks for this code by phone, text or email. Only type it on your Glance screen.", then "Didn’t ask for this? You can ignore this email. No one can sign in without this code."; footer "Sent to {email} because it was entered on a Glance screen. Glance · Calendar, weather, notes and photos for your family." No button or link. The text part carries the same words and the code. |
| SIGNIN-13 | **Signed out by the server** (an online 401; never while offline; no reason shown). |
| SIGNIN-13a | **Form:** the SIGNIN-01 form with a banner "This screen was signed out" · "Sign in again to keep the calendar, notes and photos up to date.", title "Sign in again", body "Check your family’s email below. We’ll send a code that signs this screen back in.", the last email prefilled. |
| SIGNIN-13b | **Waiting changes:** the banner adds "Changes waiting on this screen: {n}. They’ll be sent after you sign in." |
| SIGNIN-13c | **Different email:** with changes waiting, a tile under the field reads "Changes waiting on this screen belong to {previous email}. They’ll be removed from this screen if a different email signs in." with ghost "Use {previous email}", and the banner drops its second sentence. |
| SIGNIN-13d | **Timing:** never interrupts an edit; the form shows once the sheet closes or no field is focused, or at the idle timeout (to Ambient during ambient hours, AMB-07). |
| SIGNIN-13e | **Clears** only when a sign-in finishes: the same email syncs the waiting changes, another email removes them. |
| SIGNIN-14 | **"Where is this screen?"** while the first setup isn't finished: after SIGNIN-06, or on the next sign-in of an account whose step never ended. Eyebrow "New family account", body "The weather and the clock’s time zone follow this place. You can change it later in Settings." The setup card (WX-04) with primary "Continue", "Use my location", and below a hairline ghost "Skip for now". A found place is saved → Signed in (no zone confirm). Skip → Signed in, cancelling any search or locating. Either ends the first setup. A failed save or skip shows "Couldn’t save. Try again." with the place kept; Continue saves it again, editing the field drops it. |
| SIGNIN-18 | **Revoked:** after Sign out all devices (SIGNIN-11) or Delete account (SET-14), every other screen, tablet and installed phone app of the account is signed out at its next request (a sync, a push or the next time it opens). It lands on the empty email form with no SIGNIN-13 banner and no toast; its saved data, photo cache and changes waiting to sync are removed, never sent. Timing as SIGNIN-13 (never interrupts an edit; during Ambient as AMB-07). |
| SIGNIN-19 | **Terms line:** under the lock footer, "By continuing, you agree to the Terms of Service."; "Terms of Service" is an underlined link with a 44 px hit target that opens `/terms` (TERMS-01) in a new tab. **Guide line** under it: "New to Glance? Read the guide."; "guide" is an underlined link with a 44 px hit target that opens `/guide` (GUIDE-01) in a new tab. |
| SIGNIN-15 | **QR sign-in** (Settings › Account, under the screen list): secondary "Sign in another device" (`qr-code`) → a tile (the prototype's Settings › Account) with the code, "Scan to sign in", "Open the camera on the other device and point it at the code. It signs in with {email}.", "Code expires in {m:ss}" from 3:00, ghost "Done". The code is a one-time link for this account that signs the opener in (SIGNIN-09 "Welcome back"). At 0:00 a new code replaces it. A code works once, for 3 minutes, and a new one voids the old. While a code is made the box is empty at 3:00; a failure reads "Couldn’t make a code. Try again." with "Try again" (`rotate-cw`) before "Done". Done or leaving Settings voids the code. Offline the buttons are disabled. A used or expired code opens the email form, never showing the account email. Anyone who can see the screen may scan it. Phones running the installed app read it with their own scanner (SIGNIN-20), since a scanned link opens in the browser, not the app. |
| SIGNIN-20 | **Scan code from another screen** (small and normal, only when Glance runs as the installed app; never on large): a secondary button (`qr-code`) under the Send code row of the email form (states A, C). Disabled while a code is sending and while offline (the offline banner shows above it). Hidden on SIGNIN-13's signed-out form. A tap opens the camera ask (SIGNIN-21), or the scanner (SIGNIN-22) once camera access is granted. |
| SIGNIN-21 | **Camera sheets:** a bottom sheet over the scrim with an icon circle (see `Glance States - Account`, frames G, I, V). **Ask** (first use, before the phone's own prompt; state G): `camera`, eyebrow "Scan to sign in", title "Glance needs the camera", body "The camera reads the code on your Glance screen. Your phone asks next; choose Allow. Nothing is recorded or saved.", primary "Continue" (`arrow-right`) → the system prompt, then the scanner if allowed or Blocked if not; ghost "Cancel" and a scrim tap close it. **Blocked** (denied now or earlier; state I): `camera-off`, "Allow camera access in Settings", "Camera access is off for Glance. Turn it on in your phone’s Settings, then tap Try again.", primary "Try again" (`rotate-cw`) re-checks and opens the scanner when allowed, ghost "Cancel". **No camera** (state V): `camera-off`, "No camera on this device", "Sign in with your email instead.", one primary "Use email" (`mail`) that closes it. |
| SIGNIN-22 | **Scanner** (state Z). |
| SIGNIN-22a | **Layout** (see `Glance States - Account`, frame Z): full screen over the app, the live rear camera filling it. Top: "Scan to sign in". Center: a square frame with a 3 px white ring, the camera outside it under the 60% scrim; only codes inside the frame are read. Below: "Point at the code on your Glance screen", "On a signed-in screen, open Settings › Account › Sign in another device.", and an inverse pill "Cancel" that closes it. |
| SIGNIN-22b | **Code found** (AA): the ring turns block-1 (4 px), a block-1 circle with a check fills the frame, the hint reads "Code found" · "Signing in…", Cancel hides and the camera stops; once the server accepts the code (SIGNIN-15's link) the scanner closes onto Signed in, "Welcome back, {first name}" (SIGNIN-09), then Today. A code always belongs to an existing account, so the name and location steps never show. |
| SIGNIN-22c | **Not a Glance code** (AB; any other QR or link): a white tile above the hint, `circle-alert`, "That isn’t a Glance code. Keep scanning." (`role="alert"`); scanning goes on and the tile clears after 3 s or when a Glance code is read. |
| SIGNIN-22d | **Expired or used** (AC; a Glance code the server rejects): the scanner closes onto the email form with a soft info tile above the Send code row, "That code has expired or was already used. Sign in with your email instead.", cleared on the next keystroke in the email field or on Send code. |
| SIGNIN-22e | **Closing:** going offline closes the scanner onto the form with its offline banner, and a check that fails for any other reason closes it onto the form. Going to the background closes it too; the camera stops whenever the scanner closes. |

### 8.2 Today — `TODAY`
Zones: Now panel (block-1), schedule, notes and Today’s photo, each on a white panel (see `Glance States - Today`, frame A).

| ID | Requirement |
|---|---|
| TODAY-01 | **Now panel:** groups stack from the top, 24 px apart: the date with the season icon after it (`flower-2`, `sun`, `leaf`, `snowflake`) and the Clock; the weather now; the event summary. The weather and the event each start with a 1 px white divider and 24 px above their content; spare height stays at the bottom. No season label and no separate weather card. Tap cues: the weather eyebrow "{city} · Now" and the event eyebrow ("Happening now" / "Up next") end with a `chevron-right` (on the event before the countdown pill). The Clock, temperature and event title scale with the panel's width (see `Glance States - Today`, frame A); the event title takes at most two lines with "…". The panel is never narrower than 280 px and always shows everyone's plans. **Small:** no Clock; the date with the season icon, then a weather row under a white divider (icon, temperature, "High {h}° · Low {l}°" and "Rain from {time}" (only with rain), `chevron-right`; → Weather), then the event; as tall as its content. |
| TODAY-02 | Event summary (timed events only), a button: running → eyebrow "Happening now" + black pill "{n} left", title, "{location} · until {end} · {who}"; running with no end → no pill, "{location} · started {start} · {who}"; next → "Up next" + black pill "In {n}", title, "{location} · {start} · {who}"; all ended → "That's a wrap for today" / "{n} events done · free until 9 PM"; none → "The day is wide open" / "Free until 9 PM · {time left}". The last two are the **open day** state (TODAY-13). Durations as §7.2 ("45 min", "1 h 20 min"), a part minute counting as a whole one. With several running, the one that started last (ties: the shorter one). |
| TODAY-03 | Tapping the event summary, a plan, a long-plan strip, an all-day tile or a Coming up row opens Event details (EVT-09). Tapping a free slot opens New event at that slot (TL-08). The "+{n} MORE" tile opens Calendar on today (TL-12). |
| TODAY-04 | **Schedule header:** the eyebrow counts what is still ahead: "Today · {left} of {n} left" (plans not yet ended plus all-day events), "Today · All done" once everything has ended, "Today · No events" with none; on a card narrower than 450 px "{left} left today" / "All done" / "No events". Ghost "Add event" (`calendar-plus`; not while the schedule loads or fails) and "Full calendar" (`calendar-days`) are text buttons from 1440 px window width, else 56 px IconButtons named by their labels; on a card narrower than 450 px 44 px IconButtons, so the header stays on one line. The card's top padding is 12 px with 44 px header buttons and 8 px with 56 px ones, so its eyebrow lines up with the notes and Today’s photo eyebrows. **Person filter** under the header (hidden with one tag): CAL-05's stack with color circles without initials, up to 5 circles or 4 + "+N" (3, or 2 + "+N", on a card narrower than 450 px), then the label and a chevron → "Show plans for". It is the same filter as Calendar's, so changing it on one view changes the other. It filters the timeline, all-day tiles, free slots, Coming up and the count; "Add event" pre-fills the people shown. These card-width rules and TODAY-11's 400 px rule are re-checked on every render. |
| TODAY-05 | Plans move past → now → upcoming live; the event summary swaps at each start and end, and its countdown updates every minute. |
| TODAY-06 | **No events today** (no timed or all-day plans today for the people shown): no timeline while plans are coming up, since the Now panel's ribbon already shows the free time. Eyebrow "Today · No events", header buttons as usual. Under the person filter a "Coming up" eyebrow and the next 5 plans after today for those people, in order: the day ("Tomorrow", then "Wed, Oct 14") over the time or "All day", then the title, person dots and "{who} · {location}" (see `Glance States - Today`, frame B); tap → Event details. Nothing ahead → no Coming up list; large and normal show the empty Today timeline (TODAY-11: hour lines, gutter weather, now line) and small the empty today day list (CAL-10), so the zone is never blank. |
| TODAY-07 | **Today’s photo** panel (white, on every background). |
| TODAY-07a | **Header:** eyebrow "Today’s photo", ghost "Add photo" (`image-plus`) and "All photos" (`arrow-right`, only when there is no more row); on a panel narrower than 440 px both are 44 px IconButtons named by their labels. |
| TODAY-07b | **Frame:** a 4:3 frame (on large at most `25dvh − 24px` tall, uncapped on normal and small) cropped around the photo's focal point (portrait default 50% 30%). |
| TODAY-07c | **Title:** the title (one line on a panel 440 px or wider, two below): the photo's title, else its place, else its date; camera file names (`IMG_`, `DSC`, `PXL`, `MVIMG` …) never show. |
| TODAY-07d | **Caption:** a caption: "On this day · {year}", else "{date} · {place}". |
| TODAY-07e | **Button:** the frame, title and caption are one button named "Today’s photo: {title}, {caption}" → Photos on that photo, paused (PHOTO-01). |
| TODAY-07f | **More row:** with other photos, a "{n} more photos" row (up to 3 overlapping round thumbnails of other photos, `arrow-right`; named "{n} more photos, open Photos") → Photos. |
| TODAY-07g | **Add photo:** on large it opens "Add from your phone" inside the panel (the PHOTO-03 code, "Scan to add photos", "Point your phone’s camera at the code. The photos you pick show on every screen.", secondary "Choose files here" → file picker, ghost "Done"), which closes on Done, at the idle timeout or when a photo arrives; on normal and small the file picker. |
| TODAY-07h | **Loading:** a pulsing frame. |
| TODAY-07i | **First upload:** the preview at 60% with a progress bar, "Your first photo is on its way" and the mono upload status. |
| TODAY-07j | **Didn't load:** `image-off` "Photo didn’t load" ("Shows when back online" offline with no saved copy). |
| TODAY-07k | **No photos:** a tile (see `Glance States - Today`, Empty states, frame A), "A memory to share?", "{three moments}. Add family photos and one shows here each day." (three moments in a row from "Sunday pancakes", "the first snow", "a birthday cake", "pizza night", "the first day of school", "a day at the beach", "camping by the lake", starting at the day of the year, first letter capitalized) and a pill "Add from your phone" (`smartphone`, large) or "Add photos" (`upload`, normal and small); the tile does what Add photo does. |
| TODAY-07l | **Selection:** one photo per day, the same on every screen, changing at local midnight with the cross-fade (§4.4). |
| TODAY-07m | **Order:** first a photo taken on today's month and day in an earlier year (oldest year first); else the next photo in a shuffled cycle where every photo shows once before any repeats, new photos joining the end. "On this day" days don't use a cycle turn. |
| TODAY-07n | **Eligible photos:** only finished uploads count, the current background photo is skipped, and an upload never changes the day's photo unless there was none. |
| TODAY-07o | **Deleted photo:** deleting today's photo moves to the next one at once. |
| TODAY-07.1 | Example: Today Oct 9, 2026; photos taken Oct 9, 2024 and Oct 9, 2025 → the 2024 photo, caption "On this day · 2024". *(tested)* |
| TODAY-07.2 | Example: Three photos and no On this day match → each shows once, in shuffled order, before any repeats. *(tested)* |
| TODAY-07.3 | Example: Today's cycle pick is the current background photo → the next photo in the cycle shows. *(tested)* |
| TODAY-07.4 | Example: A photo uploaded today when today already has one → today's photo stays; the new one joins the end of the cycle. *(tested)* |
| TODAY-08 | **Weather now** in the Now panel, a button named "Weather now" → Weather: "{city} · Now" ("{city} · Updated {time}" for a saved forecast after a failed fetch, FAIL-02), condition icon + temperature, "{condition} · High {h}° · Low {l}°", and `umbrella` "Rain from {time}" at the first drizzle or rain hour of the hourly forecast (no line when there is none). No location → `cloud-sun` "Set weather location" / "The forecast and the clock follow it." → Weather setup. Failure → `cloud-off` "Weather unavailable" / "Trying again in {n} min.", with no button (the Weather view keeps WX-05's "Try again"). |
| TODAY-09 | **Notes box:** eyebrow "Notes · {n}" ("Notes" while loading or with none), ghost "Add note" (`square-pen`) and "All notes" (`arrow-right`, only when every note shows); on a panel narrower than 440 px both are 44 px IconButtons named by their labels. Notes stack one per row at full width; each is a button named "Note from {author}: {text}" ("Note: {text}" unsigned), the text cut at 3 lines with "…" → Note details (NOTE-10). **How many:** large shows the two newest when both fit above Today’s photo, else one; normal and small up to two. **More row:** with notes not shown, a row pinned to the panel's bottom → Notes: up to 3 overlapping paper dots, "{n} more notes", `arrow-right`; named "{n} more notes, open Notes". **Empty:** the whole dashed card (see `Glance States - Today`, Empty states, frame A) is one button → New note: the blank note pad (NOTE-07; hidden under 440 px), "Something to share at home?", "Milk in the fridge, flowers to water. Leave a note for the family." and an "Add note" pill label; no header buttons. **Loading:** tiles shaped like notes, as many as will show; the header shows "Add note" only. |
| TODAY-10 | On a photo background every zone sits on its white panel. |
| TODAY-11 | **Schedule** (large and normal) = the day timeline (§8.3.2) for today, filtered by the person filter, with no rain chips: passed hours weigh × 0.3, a gutter with sparse hour weather (TL-07), 120 px minimum columns (TL-12) and long-plan strips (TL-13). Type for standing distance on large: plan title 20 px, mono times 16 px, who and notes lines 16 px, hour labels 16 px, one-line plans 18 px; normal 18 / 14 / 15 / 14 / 17. On a card narrower than 400 px the now line's pill is a 14 px black circle, and hour labels hide only within 10 px of it. The card is at least 300 px wide and 500 px tall. Large: it fills its column and the timeline fits it. Normal: the timeline starts at 536 px and grows (up to 3×) until every current and upcoming plan has room for its full card (92 px for 30 min or more, 66 px shorter); nothing scrolls inside the card, the page scrolls. **Earlier fold:** the timeline starts at the current hour (5 AM at the earliest, 8 PM at the latest) and leaves out ended plans; it ends at 9 PM, or later so it spans at least 4 hours from its first hour: last hour = min(24, max(21, first hour + 4)) (6 PM → 10 PM, 8 PM → midnight), so late in the day it shows hour lines and the now line, not one stretched hour; free slots stay 5 AM – 9 PM (TL-08); a pill under the person filter, "Earlier · {n} done" (`chevron-down`), shows the whole day from 5 AM to 9 PM with past plans as TL-05; "Hide earlier" (`chevron-up`) folds it again. Hidden when nothing has ended. **Small:** no timeline; the card shows today's day list (CAL-10), whose "Show {n} earlier" shares the fold's state. Every plan from 5 AM to 9 PM stays on the schedule; there is no "See all" row. |
| TODAY-12 | **All-day events:** tiles above the timeline, in event order: "ALL DAY", person dot (soft for shared), title, "{who} · {location}". They never show in the event summary and never strike through. |
| TODAY-13 | **Open day** (no timed event running or later; same state as TODAY-02): eyebrow "Today · Open", the title and line, then a day ribbon 5 AM to 9 PM, the timeline's span (see `Glance States - Today`, frame B): a track, the elapsed part filled up to now, a now marker with a `clock` icon, a "Now {time}" label above it (centered on the marker, but starting at it in the first 20% of the ribbon and ending at it in the last 20%, so it never runs past the panel), a tick at sunset with a `sunset` icon above (no time; tick and icon hidden only while now is within 15 min of sunset); when the icon would overlap the "Now {time}" label it moves below the bar instead (the label's span is taken as 42% of the ribbon, placed by its alignment, plus 4% on each side), "5 AM" / "9 PM" below. On a wrapped-up day each ended event is an inset bar on the elapsed part. No "Next on the calendar" tile: what comes next shows in the schedule (TODAY-06). |
| TODAY-14 | **Layout** (Now panel). Columns, areas and rows: the prototype's Today layout (see `Glance States - Today`, frame A). **Large:** three columns, the Now panel, the schedule, then notes over Today’s photo, as tall as the window minus two gutters: no page scroll. **Normal:** two columns, the Now panel and the schedule over notes and Today’s photo; the first row is at least `max(500px, 100vh − gutter − 90px)`, so the top of the second row shows on a short day, and grows with the schedule (TODAY-11); the page scrolls. The Now panel stretches to the first row and its content sticks one gutter below the top of the screen while the schedule scrolls past, stopping at the panel's bottom edge. **Small:** one scrolling column (windows under 320 px scroll sideways): Now panel, schedule, notes, Today’s photo. The gutter runs on all four sides, so a scrolling page ends one gutter from the bottom. Today’s photo is as tall as its content (TODAY-07) and the notes panel takes the rest of its column, its more row pinned to the bottom and its empty tile filling it. Body type grows by min(width ÷ 1920, height ÷ 1080), between 1× and 1.5×. |

### 8.3 Calendar & events — `CAL`, `EVT`
Large and normal: the week strip card on top (CAL-01), then one white panel with the person filter (CAL-05) and the Today button (CAL-02) in its header, the all-day tiles, the day timeline (§8.3.2) and the 24 hours link (CAL-06). Small: the header card (CAL-02), then the day list card (CAL-10).

| ID | Requirement |
|---|---|
| CAL-01 | **Week strip** (large and normal; see `Glance States - Calendar`, frame A): a week-range eyebrow ("Oct 4 – 10", "Sep 27 – Oct 3" across two months, the year added only outside the current year: "Dec 27 – Jan 2, 2027") over the month name of the week's Saturday with no year, prev/next IconButtons, the 7 day cells Sunday to Saturday, then Add event (CAL-07). Day cell (the whole cell is the button): weekday, the date in a circle (tabular), then an info row that wraps when the cell is narrow. The circle is larger when each cell is at least 120 px wide. Selected = black circle with a white date. Today, when not selected = `surface-soft` circle. Other dates have no fill. Info row: on cells at least 120 px wide a count ("1 event", "6 events": every plan that day, whatever the filter; nothing on empty days); on narrower cells one dot per tag with a plan that day (up to 3, no "+N"). Then, on cells at least 56 px wide, the day's forecast (icon + high) on days that have one. Cells measure their own width. |
| CAL-02 | Chevrons step a week; landing on this week selects today, any other week its Sunday. **Today button** (large and normal): with another day selected, a ghost "Today" (`undo-2`) at the right end of the panel header, opposite the person filter; tap → today. **Small header** (replaces the week strip; see `Glance Phone Calendar & Events`): a card scrolling with the page. Row 1: the week-range eyebrow over the month ("October") and a `chevron-down`, one button → date picker (CAL-03); then three IconButtons: previous week, next week and Add event (`calendar-plus`). Row 2: the 7 days, one column each: weekday letter, a day circle (selected black, today `surface-soft`), up to 3 person dots under it. |
| CAL-03 | **Date picker** (small; see `Glance States - Calendar`, frame B): a centered modal over the scrim. Header "Pick a date", ghost "Today", Close. Then the month title ("October 2026") with previous and next month IconButtons, from January of this year to December of next year. Body: the design system's MonthGrid without its title, cells sized to the window: selected black, today a ring, days with plans a season-accent dot. Opens on the selected day's month. A day → selects it and closes; Today → today and closes; scrim or Close → no change. No weather. |
| CAL-04 | The timeline fills the panel with no scroll; with 24 hours on its minimum height is 760 px and the page scrolls. Changing the day or the filter reflows the timeline (TL-10). `/calendar?date=` selects that day. |
| CAL-05 | **Person filter** (`WhoStack`, opening `WhoSheet`): one button. Large and normal (panel header; see `Glance States - Calendar`, frame A): a stack of tag-color circles with initials, each over the one before; up to 8 circles, or 7 + a "+N" circle; then the label and a `chevron-down`. Small (top of the day list card): the same with up to 4 circles, or 3 + "+N" (3, or 2 + "+N", while Go to today shows). Today's variant: TODAY-04. Circles show only the people shown; nobody = one gray circle. **Label:** "Everyone" when all are shown, the names for 1–2 ("Mom, Tin"), "{n} people" for 3 or more, "No one" for nobody. **Initials:** a name of 3 letters or fewer in full, else the first letters of its first two words, else its first two letters. **Show plans for:** a centered modal over the scrim: eyebrow "{n} members", title "Show plans for", Close; rows: "Everyone" (`users`) first, then each tag: a color circle with initials, the name and a checkbox (checked shows a `check`). A row toggles that tag; Everyone selects all, or clears all when all are selected. Changes apply at once. Primary "Done" (full width), Close, a scrim tap or Escape closes it and focus returns to the stack. Every tag is selected by default. Removing a member (FAM-08) drops them from the filter; if they were the only one selected, it resets to everyone. A plan shows when any selected tag is on it; everyone plans show while any tag is selected; nobody plans only while every tag is selected. Turning every tag off leaves no plans, tiles or free slots. Filters the timeline or day list, all-day tiles and free slots; week counts and dots always show everyone. One filter for Today and Calendar, belonging to this tab. |
| CAL-06 | **24 hours** (large and normal): a centered text link under the timeline at the bottom of the card, then an icon: `chevrons-up-down` off, `chevrons-down-up` on (see `Glance States - Calendar`, frame A). Off: 5 AM to 9 PM, "Show all 24 hours", or "Show all 24 hours · {n} more plans" when the day has plans that start before 5 AM or end after 9 PM. On: 12 AM to 12 AM (TL-06), "Show 5 AM – 9 PM only" ("05:00 – 21:00" on the 24-hour clock). Stays on across days for this tab. |
| CAL-07 | **Add event:** at the right end of the week strip, after the next-week chevron: a pill with `calendar-plus` and "Add event" from 1400 px window width, else an IconButton named "Add event"; on small in the header (CAL-02). → New event on the selected day for the people shown (everyone when all are, nobody when none are). |
| CAL-08 | Empty day: the timeline shows one free slot, "Everyone free · 16 h" (or "Free · 16 h"). No events at all: the tile (`calendar-days`) "The calendar is empty" / "Select a day, then add an event. Days with plans get a dot for each person." replaces the timeline (on small without the box). |
| CAL-09 | All-day tiles above the timeline, as TODAY-12, filtered by CAL-05. |
| CAL-10 | **Day list** (small; also Today's schedule on small; see `Glance Phone Calendar & Events`): a card of groups. Top row: the person filter and, with another day selected, a "Go to today" IconButton (`undo-2`) on the right. All-day tiles ("ALL DAY", person dot, title, location) above the groups. Plans follow one another in start order, never in columns. **Plan tile**, colored as TL-05, shared plans with up to 4 person dots at the right of the time line: the time range (the start only with no end), the title (up to 2 lines), "{who} · {location}" (one line, "…"), then an optional line with a "{p}% rain" chip (rain ≥ 50%, with an hourly forecast) and the first line of Notes (`file-text`). Tap → Event details. **Today:** a "Show {n} earlier" pill (`chevron-down`) that shows the ended plans in place ("Hide earlier", `chevron-up`; folded by default), then "Happening now", then "Later today · {n}". **Other days:** one group "{n} events" ("1 event"). **Free time:** TL-08's gaps (on today only after now), in order, as dashed tiles with the start time, "Everyone free · {length}" or "Free · {length}" (wrapping under the time, never cut) and a `plus`; tap → New event in that slot. **Empty:** "Nothing scheduled." (then the free tile); nobody selected: "No one selected, so no plans show."; no events at all: CAL-08. No hour grid, now line, hour weather or 24 hours link. |
| EVT-01 | **Event page** (New event, Edit event and Event details are one page; source `Glance New Event`): full screen over everything including the nav, no scrim. It slides in from the right and out to the right, ignoring taps while it leaves (motion: see `Glance New Event`). Notes, photos and Photo details stay modal sheets. **Layout** (see `Glance New Event`): the task bar (EVT-05), then the sentence card (EVT-02) over the picker card (EVT-12), and on large the day preview column beside them (EVT-13), as the mockup. The page scrolls as a whole with one page scrollbar; the cards have no inner scroll, and the task bar stays pinned at the top. |
| EVT-02 | **Sentence card** (as tall as its content; sizes and type: see `Glance New Event`): the event as one sentence: "{title} on {Fri, Oct 9} from {11:00 AM} to {12:00 PM} for {who} at {place}." All day: "… on {day}, {all day}, for …" ("all day" is the Starts word); no end: "… at {start} for …". Each {} is a **word**: inline text (`role="button"`, Enter or Space selects it), named "{field}: {value}. Change" ("{field}: not set. Change" for a placeholder), that selects its picker (EVT-12). Field names: "What’s happening", "Day", "Starts", "Ends", "Who it’s for", "Where", "Notes". A set word and a placeholder look different: placeholders are "What’s happening", "a place", and the defaults until touched (EVT-03). The selected word is highlighted, per line. Day and time words never break across lines; filled title, who and place wrap; placeholders never split. **Who** reads "everyone", "{a}", "{a} and {b}", "{a}, {b} and {c}" or "{a}, {b} and {n} others", in tag order ("no one" for nobody). **Link row** (under the sentence; plain text controls, 44 px tall): an underlined "Add notes" with `plus`, which reads "Notes: {first 25 characters}…" without the icon once notes are typed and is highlighted while the Notes picker is open; and "Add end time" when there is no end (TPK-08). A second row holds the Same time line (EVT-13) and, at its right end, the Notification control (NOTIF-09). |
| EVT-03 | **Defaults and Save:** a new event starts on today (or the day or slot it was added from: CAL-07, TL-08, CAL-10), the TPK-05 times, and the people shown (CAL-07, TODAY-04). Day, start, end and who show as placeholders until touched: a word becomes set when it is tapped or reached with Next (opening its picker accepts the default) or its value changes; changing the start also sets the start, picking a length sets the end. Edit event starts with every word set. Save is disabled until the title has text (trimmed); there is no "Add a title" error. |
| EVT-04 | Time entry: §8.3.1. |
| EVT-05 | **Task bar** (sizes, fill and shadow: see `Glance New Event`): a row above the cards, sticky at the top of the page, full width, so content scrolls under it. Once the page is scrolled (scroll top > 0) it gets a shadow; at the top it has none. Left: the title: "New event", "Edit event", or Event details' status (EVT-09). Right: ghost "Delete" (Edit event only, EVT-06), a compact primary Save with `check` ("Save event" for a new event on large and normal, "Save" when editing and on small, "Save for later" offline), then a ✕ IconButton named "Close". There is no Cancel. **✕:** with no changes it closes at once; with changes the actions and the ✕ are replaced in place by "Discard changes?", secondary "Keep editing" and `danger` "Discard" (on small the title hides while it asks). Keep editing brings the actions back; Discard drops the changes and closes. From Event details, ✕ with no changes and Discard return to details. The idle timeout discards without asking. |
| EVT-06 | **Delete** (Edit event only): ghost "Delete" (`trash-2`) before Save. The first tap turns it into `danger` "Delete event" with a ghost "Keep" before it that backs out; a tap on "Delete event" deletes the event and closes the page. |
| EVT-07 | Save closes the page, or returns to Event details with the new values when editing from there; the timeline, week dots and Today update at once. |
| EVT-08 | **All day:** the "All day" chip in the Starts picker header (`sun`; pressed when on; its animation: see `Glance New Event`). On: the AM/PM toggle and the Hour and Minutes grids stay but are disabled (nothing selected, the toggle's thumb hidden); Ends is skipped and the sentence reads "on {day}, all day,"; the event fills its date. Off: the start and end return with the draft's times. Ambient reads "All day". |
| EVT-09 | **Event details** (every tap on an existing event opens it; new events skip it): the event page in view mode. **Task bar:** a `clock` icon and the status title: "Happening now", "In {2 hr 49 min}" (later today; lengths as §7.2), "Today" (all day today), "Tomorrow", "In {n} days" or "Ended" (STATUS-01; an all-day event on an earlier day is ended); then secondary "Edit" (`pencil`) and the ✕, which closes the page. **Sentence card:** the same card in the same place and size, so it stays put when editing starts; values 540 with no underline, named "{field}: {value}. Edit". Each person has a dot in their color before the name; up to three names, else "{a}, {b} and {n} others"; everyone reads "everyone" with no dot; with no place the "at …" part is left out. No link row. Notes, if any, follow as plain text (line breaks kept), and "Notification off" (`bell-off`) when the event's Notification is off. **The card below:** "Forecast · {Fri, Oct 9}" with the weather tile (EVT-13; "No forecast for this date yet.") and "Also at this time · {n}" with the overlapping plans, or "Nothing else at this time." (all day: "Also that day · {n}" / "Nothing else that day."). Large and normal: a forecast column beside the plans; small stacked (see `Glance New Event`). **Ended** events: title "Ended", no Edit, values not tappable, and under the sentence `lock` + "This event has ended and can’t be changed." No offline banner. |
| EVT-10 | **Edit from details:** "Edit" opens Edit event on the title; a tapped value opens it on that word's picker. The sentence card keeps its place, the values gain their underlines and the picker card replaces the forecast card. ✕, Discard and Save return to details (EVT-05, EVT-07); Delete closes the page. |
| EVT-11 | **Who picker:** "Everyone" (`users`), then one chip per tag with its color dot, multi-select. Picking every tag selects Everyone; Everyone selects every tag; unpicking the last tag selects Everyone. Below them an **"Add a person"** field (at most 32 characters) with **suggestions** while typing: pills (dot + name) for tags not yet on the event whose name fuzzy-matches, best first: starts with it → a word starts with it → contains it → its letters appear in order ("mnh" → Minh-An) → one typo away (3+ characters); matching ignores case, accents, spaces and hyphens; no match → no suggestions. A tap, or Enter on an exact name (any case), puts that tag on the event and clears the field; a name that matches no tag shows the NEW MEMBER tile (FAM-04). An event saved with every tag stores everyone. A nobody event (CAL-07 with no one shown) opens with no chip picked. |
| EVT-12 | **Picker card** (sizes: see `Glance New Event`): the picker for the selected word. **Header**: the field name as eyebrow ("Ends · {length}" on large and normal), the AM/PM toggle on Starts and Ends (TPK-01), the All day chip on Starts (EVT-08), and at the right a soft "Next: {field}" with `arrow-right` ("Next" on small; hidden on the last field). **Order:** title, day, starts, ends, who, where, notes; Ends is skipped when all day or with no end. The header wraps onto a second row when it doesn't fit (small). Enter in the title or place field = Next; in Notes it adds a line break. Chips: selected black, `aria-pressed`. **Title:** a 2-row textarea (with a focus ring; at most 140 characters, no line breaks), then "Recent" chips with recent titles; picking one sets the title and moves to Day. **Day:** Today · Tomorrow · Next week chips (today + 7; label + date; a column on large and normal, a wrapping row on small) beside a month grid (‹ › arrows from this month on, 44 px day cells named "{Wkd}, {Month} {d}" plus ", today"; past days disabled, today ringed, selected black). A day keeps the times. **Starts / Ends:** §8.3.1. **Who:** EVT-11. **Where:** a text field (at most 60 characters, "Home, school, park…") + "Recent places" chips. **Notes:** a 4-row textarea (at most 280 characters, "Anything to remember"), saved trimmed. Tapping the title or place word or the Notes link, or reaching a text field with Next, focuses it with the caret at the end. **Recent** titles and places: the distinct titles and places (trimmed, ignoring case) of the account's events, most recently changed first, at most 6 and 5. |
| EVT-13 | **Day preview and Same time** (New event and Edit event). **Large:** the day preview, a column on the right (see `Glance New Event`), always shown, with no heading (named "{Fri, Oct 9} · {start} – {end}", "· All day", or the start alone with no end). A weather tile in the season weather color (block-3): icon, temperature at the start hour, condition, "· {n}% rain" at 30%+; for events over an hour an hourly strip, up to 6 hours; all day = the day high; no forecast → "No forecast for this date yet."; hidden without a location. Then "Also at this time · {n}": the plans overlapping the chosen time (all-day included) as plain text, a time line ("8:15 AM – 3:00 PM", "All day") then "{title} · {who}", with an accent dot when the plan shares a person with this event (a plain one otherwise); none → "Nothing else at this time." The chosen time with no end counts as 30 minutes, another plan with no end as its start minute. **Normal:** no day preview; the **Same time** line in the link row (EVT-02), only when someone on the event has another timed plan that overlaps it (all-day plans don’t count): an accent dot and "Same time: {names} {is\|are} also at {title}, {start} – {end}", plus " · {n} more" for further clashes (`role="status"`, not tappable). {names}: "Everyone" when it is every tag, "{a}", "{a} and {b}", else "{a}, {b} and {n} others"; "is" for one person or Everyone. **Small:** neither. |

#### 8.3.1 Time entry — `TPK`

| ID | Requirement |
|---|---|
| TPK-01 | **Starts / Ends picker** (EVT-12): the header eyebrow "Starts" or "Ends" ("Ends · {length}" on large and normal: "1 hr", "45 min", "1 hr 30 min"), then (12-hour only) the AM/PM toggle: a pill track named "AM or PM", "AM" and "PM" always visible, a thumb that slides under the chosen one (see `Glance New Event`). |
| TPK-02 | No keyboard and no typing: each tap changes one part (hour, minutes or AM/PM) and keeps the others. |
| TPK-03 | **Grids:** "Hour" (12, 1 … 11) and "Minutes" (:00 … :55 by 5) rows with labels beside the cells on large and normal, stacked above them on small (see `Glance New Event`). Selected = black; disabled cells take no tap. |
| TPK-04 | Ends adds a "Length" row (30 min · 1 hr · 1 hr 30 · 2 hr, from the start, capped at 11:55 PM) and a ghost "No end time" (TPK-08). |
| TPK-05 | **Defaults:** start at the next whole hour (10:41 → 11:00, 11:00 → 12:00), capped at 11:00 PM; end = start + 1 h, capped at 11:55 PM. |
| TPK-05.1 | Example: Now 10:41 AM → 11:00 AM – 12:00 PM. *(tested)* |
| TPK-05.2 | Example: Now 10:10 PM → 11:00–11:55 PM. *(tested)* |
| TPK-05.3 | Example: Now 11:45 PM → 11:00–11:55 PM. *(tested)* |
| TPK-06 | Changing the start keeps the length (end capped at 11:55 PM); an event with no end keeps none. With an end, a start later than 11:50 PM moves to 11:50 PM so the end stays 5 minutes after it (TPK-07). |
| TPK-06.1 | Example: 11:00 AM – 12:00 PM, start moved to 2:00 PM → 2:00–3:00 PM. *(tested)* |
| TPK-06.2 | Example: 11:00 AM – 1:00 PM, start moved to 11:00 PM → 11:00–11:55 PM. *(tested)* |
| TPK-06.3 | Example: 11:00 AM – 12:00 PM, start moved to 11:55 PM → 11:50–11:55 PM. *(tested)* |
| TPK-06.4 | Example: 11:00 AM with no end, start moved to 2:00 PM → 2:00 PM, no end. *(tested)* |
| TPK-07 | Ends is at least 5 minutes after Starts, on the same day. In the Ends grids, hour cells whose :55 is earlier than start + 5 min and minute cells earlier than start + 5 min are disabled; a pick that would land earlier moves to start + 5 min. There is no "Ends before it starts" error. |
| TPK-07.1 | Example: Start 11:00 AM, end picked 10:30 AM → the end moves to 11:05 AM. *(tested)* |
| TPK-07.2 | Example: Start 11:00 AM → end hour 10 disabled, 11 enabled. *(tested)* |
| TPK-07.3 | Example: Start 11:30 AM → end cell 11:30 disabled, 11:35 enabled. *(tested)* |
| TPK-08 | **No end:** "No end time" clears the end and moves to Who; the sentence reads "at {start}" and the link row shows "Add end time", which sets start + 1 h (capped at 11:55 PM) and opens Ends. The plan card shows only the start and ends at the end of its day for layout; the event summary reads "{where} · started {time}". |
| TPK-09 | The Clock setting drives the sentence, the picker and plan cards (§7.2): on the 24-hour clock the Hour row reads 00 … 23 and the AM/PM toggle is hidden. Offline the page works the same and Save reads "Save for later". |
| TPK-10 | Cells use `aria-pressed`. Hours are named "3 PM" (or "15 hundred"); minutes "{nn} minutes". |

#### 8.3.2 Day timeline — `TL`
Used by Calendar (any day, filtered) and Today (today, filtered) on large and normal; small uses the day list (CAL-10). Pure layout rules live in `src/domain` (tech design).

| ID | Requirement |
|---|---|
| TL-01 | **Span** 5 AM to 9 PM (Calendar can switch to 24 hours, TL-06). It fits its card with no scroll. Hour labels sit in a left gutter; a label hides when it would sit closer than 24 px to the one above or 22 px to the now marker. On Calendar every hour row is at least 26 px tall, so every hour gets a label except next to the now marker; the elastic height is shared out on top of that. |
| TL-02 | **Elastic hours:** an hour's weight = 1 + 3 × the share of that hour covered by plans of 3 hours or less (longer plans don't stretch hours). On today, hours that have fully passed weigh × 0.35 on Calendar and × 0.3 on Today. Heights are the weights scaled to the card. |
| TL-02.1 | Example: A day other than today, no plans 6–7 PM → that hour weighs 1. *(tested)* |
| TL-02.2 | Example: Another day, one plan 9:00–10:30 AM → 9 AM weighs 4, 10 AM weighs 1 + 3 × 0.5 = 2.5. *(tested)* |
| TL-02.3 | Example: A 7:00–11:00 AM plan (4 hours) alone in 7–8 AM → 7 AM weighs 1. *(tested)* |
| TL-02.4 | Example: Today at 10:41 AM, 7–8 AM fully covered by short plans → 4 × 0.35 = 1.4 on Calendar, 4 × 0.3 = 1.2 on Today; an empty 5–6 AM → 0.35 on Calendar. *(tested)* |
| TL-03 | **Overlaps:** overlapping plans share the width in columns; longer plans take the leftmost column, and a plan widens into free columns beside it. Every plan is at least 44 px tall (48 px with the 4 px gap). Plans over 3 hours leave the columns (TL-13), and the columns are capped (TL-12). |
| TL-03.1 | Example: 9:00–10:00, 9:00–9:30 and 9:30–10:00 → the hour-long plan in the left half, the two half-hour plans in the right half. *(tested)* |
| TL-03.2 | Example: 9:00–10:00, two 9:00–9:30 plans and 9:30–10:00 → three columns; the 9:30 plan widens over the two columns the 9:00–9:30 plans free (from 1/3, 2/3 wide). *(tested)* |
| TL-03.3 | Example: A 3:00–3:15 PM plan in a short hour → still the minimum height. *(tested)* |
| TL-03.4 | Example: A plan that overlaps nothing → the full width. *(tested)* |
| TL-04 | **Plan cards** (a button named "{title}, {range}"): content follows the card's real size: time + title, then a second title line, then "{who} · {location}", then the first line of Notes (`file-text`). Too short for that → one line: start time (hidden under 200 px wide), title, person dots. Under 260 px wide → the start time only, with AM/PM. A plan that started before 5 AM shows "Until {end}" for its time. Lines end in "…", never wrap. |
| TL-05 | **Colors:** the event's color (§7); past (STATUS-01) and now each have their own look (see `Glance States - Calendar`, frame A); past is never struck through; now has no NOW pill. Other days are never now. |
| TL-06 | **24 hours** (Calendar only): 12 AM to 12 AM; night hours (before 5 AM, from 9 PM) without plans weigh half, night hours with plans are elastic as TL-02. Hour labels and hairlines thin out when rows get tight. |
| TL-07 | **Hour weather:** each hour label in the gutter shows that hour's weather under it (an icon named by condition + temperature) when the hour is at least 46 px tall and clear of the now marker. Calendar shows every hour; Today only where it says something new: the first hour on the timeline, an icon change, rain starting or stopping (50% or more), else every 3 hours. No weather lane: plans use the full width. On Calendar, plans that aren't past and overlap an hour with rain ≥ 50% get a "{p}% rain" chip on the time line of cards at least 180 px wide (not on one-line cards; the chance stays in the plan's name). Only with a location and an hourly forecast for that day; covers all 24 hours when TL-06 is on. |
| TL-08 | **Free slots:** gaps of 30 min or more between 5 AM and 9 PM with no plan for the selected tags show as dashed tiles: "Everyone free · {length}" when everyone is selected, else "Free · {length}"; named "Free {range}. Add event". Long-plan strips count as busy. On today a slot starts at now. A slot shorter than 44 px isn't drawn. Tap → New event starting at the slot start rounded up to 15 min, 1 hour long or to the slot's end. |
| TL-08.1 | Example: Another day with plans 4:30–5:15 AM, 7:00–11:00 AM, 9:00–10:30 AM, 11:00 AM–12:00 PM and 2:00–4:00 PM → free slots 5:15–7:00 AM, 12:00–2:00 PM and 4:00–9:00 PM. *(tested)* |
| TL-08.2 | Example: Today at 10:41 AM, no plans → one slot 10:41 AM – 9:00 PM; tap → New event 10:45–11:45 AM. *(tested)* |
| TL-08.3 | Example: A free 8:30–9:00 PM slot → New event 8:30–9:00 PM (ends at the slot's end). *(tested)* |
| TL-08.4 | Example: Today at 8:40 PM, free since 4:00 PM → 20 minutes left, under 30 → no slot. *(tested)* |
| TL-09 | **Now marker** (today only): a line across the timeline, drawn behind the plan cards, with a time pill on top in the gutter (Calendar: 2 × 6 px padding; Today: TODAY-11's circle on narrow cards), moving every minute. |
| TL-10 | Tapping a plan opens Event details (EVT-09). Day or filter changes reflow with the tab/tile motion (§4.4; at once with reduced motion). |
| TL-12 | **Column cap:** overlap columns are at least 120 px wide on Today and 200 px on Calendar. When more columns overlap than fit, the columns that fit stay and the rest fold into a 52 px "+{n} MORE" tile on the right (the count over "MORE", at least 48 px tall; the count alone under 60 px) spanning the folded plans' time range. Tap: Today → Calendar on today; Calendar → Event details of the earliest folded plan. Plans with nothing folded beside them use the full width. |
| TL-12.1 | Example: Calendar, 600 px wide, four overlapping plans 9:00–10:00, 9:00–10:00, 9:10–10:00 and 9:05–10:00 → two columns stay and "+2 MORE" spans 9:05–10:00 on the right; tap → Event details of the 9:05 plan. *(tested)* |
| TL-12.2 | Example: Same card, four plans 6:00–6:15 PM → a 48 px "+2" tile showing the count alone. *(tested)* |
| TL-12.3 | Example: Calendar, 1000 px wide, four overlapping plans → four 250 px columns, nothing folds. *(tested)* |
| TL-12.4 | Example: Today, 400 px wide, four overlapping plans → only 3 columns of 120 px fit, so two stay beside the 52 px tile, "+2 MORE"; tap → Calendar on today. *(not tested)* |
| TL-13 | **Long plans** (over 3 hours, e.g. School): 44 px edge strips between the hour gutter and the plans (8 px gap; several sit side by side): the plan's fill, a vertical title and range ("8:15 – 3:00 PM"), cut at the strip's height; past and now as TL-05. A button named like a plan card → Event details. The other plans use the remaining width. |
#### 8.3.3 Tags — `FAM`

| ID | Requirement |
|---|---|
| FAM-07 | Tags are the family's people (§7). There is no list or sheet to manage them and no Edit button on the person filter; they can be removed from Settings (FAM-08) but never renamed or recolored. |
| FAM-04 | **New tag** from the Who picker's "Add a person" field (EVT-11): when the typed name matches no tag exactly (any case), a tile between the field and the suggestions (see `Glance States - Calendar`, frame C): "NEW MEMBER" + a preview pill in the chosen color, primary "Add member", then the 12 color swatches (the first color no tag uses is preselected, any color once all are taken). "Add member" or Enter creates the tag and puts it on this event. Offline it syncs later (SYNC-02); if another screen added a tag with the same name first, this screen's tag becomes that one when it syncs, and its events keep the person. |
| FAM-05 | A new tag goes last in the filter and the week dots (selected when the filter shows everyone) and joins every everyone plan. |
| FAM-08 | **Remove a member** (Settings, SET-16): a card (see `Glance States - Settings`, frame R) with the eyebrow "Family · {n} members" ("1 member"), then a list. Row: a circle in the tag's color, the name (ellipsis), a count ("{n} plans", "1 plan", "No plans") and a secondary "Remove" (`trash-2`, named "Remove {name}"). **Two taps:** the first swaps the count for the result line and the button for a right-aligned row under it (wrapping on narrow cards): ghost "Cancel" and a `danger` "Remove {name}"; only one row asks at a time, so asking on another row cancels the first. Result line: "Their {n} plans are deleted." ("Their 1 plan is deleted.") for events with only that tag, then "They’re taken off {n} plans shared with others." ("1 plan") for events with other tags too, joined by a space; "They have no plans." with neither. Plans counts every live event, past ones too, whose people name the tag; everyone events are not counted and don't change. The second tap removes at once, with no dialog: the tag is deleted, its only-tag events are deleted, it is dropped from its shared events, and it leaves the person filter (CAL-05). It works offline and syncs later (SYNC-02). The last member has no Remove button and the card says "The last member can’t be removed."; the server refuses removing the last tag too. A removed member's name can be added again from the Who picker (FAM-04) as a new tag. |

### 8.4 Weather — `WX`

| ID | Requirement |
|---|---|
| WX-01 | Read-only. Left: `WeatherNow` "{city}, {state code} · Now" with "H {h}° · L {l}° · Feels like {f}°" under the condition, then the four details, Wind ("8 mph NW"), Humidity, UV index and Sunset, under a divider (see `Glance States - Weather`, frame A); their labels and values never wrap word by word. Right: Banner, "Next 8 hours" (time, icon, temp°), "7-day forecast" (today highlighted, rain % from 10%). |
| WX-02 | Values follow the unit setting, no unit letter. With °C wind is km/h. |
| WX-03 | Rain banner (cloud-rain) "Rain moving in after {time}" / "Grab an umbrella if you're heading out." when any of the next 8 hours is ≥ 50%, at the first such hour. Offline and the forecast over an hour old: "Forecast from {time}" / "Updates when the screen is back online. Conditions may have changed." |
| WX-04 | **Setup card** (no location; see `Glance States - Weather`, frame E): eyebrow "Weather · setup", "Where is this screen?", "The forecast and the clock’s time zone follow this place. You can change it later in Settings.", field "City or ZIP code" ("Portland, OR"), primary "Show weather" and secondary "Use my location" (LOC-01). Empty → "Enter a city or ZIP code". The same card is used by SET-09 (primary "Search") and SIGNIN-14 ("Continue"). |
| WX-05 | Loading skeleton; failure "Weather unavailable" / "The forecast service isn't responding. Trying again in {n} min." + "Try again". |
| WX-06 | Refreshes every 15 min. The location is changed in Settings › Location. |
| WX-07 | **Searching:** the buttons become "Looking for {query}…" with a search icon (see `Glance States - Weather`, frame B). Typing cancels. A failed search: "Place search isn’t responding. Try again in a moment." (text kept, cleared on the next keystroke). |
| WX-08 | Unknown place: "We couldn't find that place. Try a city and state, like Austin, TX". |
| WX-09 | **Several matches:** "{n} places called {city}", one row each (see `Glance States - Weather`, frame D; city, "{state}, United States · {time zone name}"). A tap sets the place and its time zone. Typing clears the list. A single match is set at once. US only; city, "City, ST" or ZIP; at most 5, largest first. |
| WX-10 | **Attribution** (Open-Meteo's CC BY 4.0 license): under the 7-day forecast, "Weather data by Open-Meteo.com" (underlined, 44 px hit target), a link to `https://open-meteo.com/` that opens in a new tab (`rel="noopener"`). Shown whenever forecast data shows; not in the setup or failed state. |

### 8.5 Notes — `NOTE`
White panel: the count eyebrow (NOTE-06), "Notice board", "Add note" (`square-pen`). The board grid, note sizes and type: see `Glance States - Notes`, frame A. No caption under the board. Every note is one paper tone, the season soft color (cream in spring, summer and fall; frost in winter), so color on Today always means a person.

| ID | Requirement |
|---|---|
| NOTE-01 | "Add note" → New note; a note → Note details (NOTE-10); its Edit → Edit note. Each board note is a button named "Note from {author}, {time}: {text}" ("Note, {time}: {text}" unsigned), with the text cut at a word after 120 characters with "…"; details show it in full. |
| NOTE-02 | **New note / Edit note** (`NoteComposer`): the whole sheet is the paper: the paper fill on the sheet and its sticky header and footer (see `Glance States - Notes`, frame B); on large and normal pinned to the top so the keyboard never covers it, on small full screen with no corners. Header: eyebrow "New note" / "Edit note" centered on the ✕, no visible title (the dialog is named by it). Body on the paper: a borderless textarea (focused on open, at most 280 characters, placeholder "Leave a note for the family") that starts one line tall and grows with the text up to 50vh, then scrolls; under it a "From" TextInput (label above, placeholder "Your name", at most 32 characters, kept as typed; not tied to tags). New note prefills the last name posted from this screen (blank at first); Edit keeps the note's author. In Edit, the author and time show in the footer. |
| NOTE-03 | Empty message on Post → "Write a message" in the error style between the text and From. A blank name posts unsigned: the board and details show only the time. |
| NOTE-04 | Newest first everywhere. Board notes tilt in turn (`Glance States - Notes`, frame A). Stamp: "Just now" for 5 min, then the time the same day ("9:05 AM"), the short weekday and time within 6 days ("Tue 6:40 PM"), then "{Mon} {d}". |
| NOTE-05 | Footer: no Cancel (✕ closes, with the §8.9 discard check); primary "Post note" with no icon ("Save" when editing, "Save for later" offline) on the right; past 120 characters "Board shows the first 120" on its left. |
| NOTE-06 | Count eyebrow "{n} notes · cleared after {n} days" ("1 note", "1 day"), "{n} notes · kept until deleted" while expiry is off, "No notes" when empty. |
| NOTE-07 | Empty board: a dashed outline box filling the board's height, with a blank sticky-note pad (with a `plus` button; see the prototype's empty Notes) that opens New note, and centered copy "Something to share at home?" / "Fresh milk in the fridge, flowers to water, a pickup at 5. Tap the pad and leave a note for the family." |
| NOTE-08 | Notes older than the expiry (`noteExpiry.days` × 24 h since created, while it's on) are deleted by the server and hidden by every screen, offline too. |
| NOTE-09 | Anyone can edit or delete any note. The board scrolls. |
| NOTE-10 | **Note details** (read-only): eyebrow "{author} · {time}" (the time alone when unsigned; "Waiting to post" until sent) centered on the ✕, no visible title (the dialog is named "Note from {author}", "Note" when unsigned). The sheet is the sticky note: paper fill (footer too), straight (no tilt; see `Glance States - Notes`, frame D). The full message with line breaks kept, nothing clipped. Footer: ghost "Delete" (`trash-2`) on the left → inline `danger` "Delete note"; primary "Edit" (`pencil`) on the right, which turns the same sheet into Edit note (NOTE-02). From Edit, ✕ returns to details (after "Discard changes?" when changed) and Save returns to details with the new text; the scrim closes the sheet; Delete closes it. No color picker and no offline banner in details. |

### 8.6 Photos — `PHOTO`
Left: the featured image, name, "{date} · {place}" and the featured actions (PHOTO-11). Right: a panel "Photos · {n}" (one line, "…"), ghost "Upload", a thumb grid (the selected thumb ringed), each with the name (one line, "…") over the date. Sizes: see `Glance States - Photos`, frame A. Large and normal: the screen fits the window with no page scroll; the panel matches the featured block's height and the grid scrolls inside it (eyebrow and Upload stay put), following the slideshow: when the current photo is out of view it scrolls just enough to bring it in with 12 px to spare. Small: the grid runs full length in the page scroll.

| ID | Requirement |
|---|---|
| PHOTO-01 | A thumb features its photo. Chevrons wrap. `/photos?photo={id}` features that photo with the slideshow paused until someone steps, picks or plays; an unknown id opens as usual. |
| PHOTO-02 | Slideshow advances every 8 s while open. Pause ↔ Play. Chevrons and thumbs keep it playing. |
| PHOTO-03 | **Upload:** on large and normal it toggles an "Add from your phone" panel above the grid (a QR code, "Scan to add photos", "Point your phone’s camera at the code and pick photos. They show here as they finish uploading.", secondary "Choose files here" → the file picker, ghost "Done"); on small it opens the file picker. The code is a one-time sign-in link for this account with SIGNIN-15's rules (works once, for 3 minutes, replaced at 0:00 while shown) that opens Photos on the phone, where Upload opens its file picker. The picker takes `image/*`, multiple. New photos go first, with details read from the file (PHOTO-10). |
| PHOTO-04 | Size (≤ 20 MB) and type checks run before upload; upload shows real progress. |
| PHOTO-05 | Empty: image icon, "Photos · 0", "No photos yet", "Upload family photos to show them here, as the picture of the day and as a background." Large and normal: a card with a QR code (PHOTO-03), "Scan to add photos" and ghost "Choose files here". Small and offline: "Upload photos". |
| PHOTO-06 | **Uploading:** each file shows first in the grid as a faded preview with a progress bar and "{n}%" ("Waiting" at 0; see `Glance States - Photos`, frames B, C). A row above reads "Uploading {name}" / "Uploading {n} photos" + average %. A tile becomes a normal photo at 100%. |
| PHOTO-07 | Uploads never block the slideshow; it uses finished photos only. With none yet: "Your photos show here once they finish uploading." |
| PHOTO-08 | **Per-file failure** (only that tile changes): the preview stays faded (see `Glance States - Photos`, frame D), a pill names the short reason ("Over 20 MB", "Not a photo", "Failed"; named "Too large · 20 MB max", "Not a photo", "Didn't upload"), buttons sit inside the tile, and the caption keeps the full name over "Not uploaded". A photo that would pass the account's storage limit (SET-13) gets the pill "Storage full" (named "Storage full · delete photos to make room") and Remove only, and the row reads "Storage full" with "Clear". Network failures get Try again (from 0%) and Remove; too large and not a photo Remove only. Row "{n} photo(s) didn't upload" with ghost "Try again" (only with a network failure in the set; retries all of them) and "Clear" (removes every failed tile). |
| PHOTO-09 | **Offline:** upload buttons disabled with the pill "Offline · upload when back online". Uploads pause ("Paused") and resume on reconnect (restarting from 0% if their send failed). Paused uploads are lost on reload. Row "Offline · {n} upload paused until back online". |
| PHOTO-10 | **Details from the file**, read on upload. **Name:** metadata title → words from the file name (camera prefixes, dates, digit runs and the words at, am, pm, copy, edited, final removed; needs a 3+ letter word; all-lowercase gets a capital) → the place's city → the file name without extension. Blank or camera-placeholder titles ("OLYMPUS DIGITAL CAMERA", "Default", "Image") don't count. **Date:** metadata date taken → a date in the name (`2025-10-31`, `20251031`) → the file's modified day → the upload day. **Place:** GPS → "City, ST" (US only), else empty. Until saved in Photo details, a hint under the featured photo: "Name and date guessed from the file name.", "Date guessed from the file date.", "Name guessed from where it was taken.", plus "No place found." |
| PHOTO-10.1 | Example: "halloween-costumes-2025-10-31.jpg", no metadata → name "Halloween costumes", date Oct 31, 2025. *(tested)* |
| PHOTO-10.2 | Example: "IMG_2041 Mia birthday.jpg" → name "Mia birthday". *(tested)* |
| PHOTO-10.3 | Example: "IMG_4410.jpg" with no title or date in the file, GPS in Portland, OR, modified Sep 6, 2026 → name "Portland", date Sep 6, 2026, place "Portland, OR". *(tested)* |
| PHOTO-10.4 | Example: Metadata title "OLYMPUS DIGITAL CAMERA" on "P1010001.JPG", no GPS, no modified date → name "P1010001", date the upload day, no place. *(not tested; the placeholder rule and the file-name fallback are)* |
| PHOTO-11 | The featured photo shows name and "{date} · {place}" (year outside the current year; "No date" without one). **Featured actions**, one row wrapping when narrow: ghost Set as background (PHOTO-15), "Edit details" (`pencil`; opens Photo details and pauses the slideshow) and "Delete" (PHOTO-13); then IconButtons Previous, Play/Pause, Next and Full screen. |
| PHOTO-12 | **Photo details** sheet: eyebrow "Family photos", title "Photo details", a preview with "File: {file name}" under it (one line, "…"; see `Glance States - Photos`, frames J, K), **Name** (required), **Date taken** (date field, no future dates), **Place**. Each field has a source caption: "From photo", "From photo location", "Guessed from file name", "Guessed from file date", "Guessed from place", "Not in photo", "File name"; a change reads "Edited" (typing back to the original isn't). Empty name → "Add a name"; a future date → "No future dates". Clearing the date saves "No date". Save updates the photo everywhere and syncs; offline it reads "Save for later". |
| PHOTO-13 | **Delete** (featured actions, ghost `trash-2`, hidden offline): pauses the slideshow and turns in place into a `danger` "Delete photo" and "Cancel"; moving to another photo cancels. Photo details keeps its own Delete with the same confirm. The photo (or the upload) leaves every list on every screen, the next photo takes its place, and its files are deleted. A deleted background photo turns the background back to Season color. |
| PHOTO-14 | **Full screen** (tap the photo or `maximize`, with at least one finished photo): black, above everything, photo uncropped. Top: "{n} of {total}", "Exit full screen" (`minimize`). Bottom: name, "{date} · {place}", Previous, Play/Pause, Next as IconButtons (see `Glance States - Photos`, frames L, M). Tapping the photo hides or shows both rows (shown on open). The slideshow keeps its state. Esc exits, ← → step, Space plays/pauses. Closes on Exit, a view change or the idle timeout. A `dialog` named "{name} · full screen". |
| PHOTO-15 | **Set as background:** a ghost "Set as background" (`image`) under the featured photo's name. Tap → that photo becomes the fixed background on every screen (mode Photo, replacing Season color or Slideshow, dim kept) and the slideshow pauses. When the featured photo is already the Photo-mode background it reads "Background now · Change" (`check`) and opens the Background page. |
| PHOTO-16 | **Portrait photos** (taller than wide): thumbs, Today’s photo and backgrounds crop them like any photo; the featured photo shows them whole (contain, white bars at the sides, also for uploads measured on load); full screen always shows the whole photo. |

### 8.7 Settings & Background — `SET`, `BG`
Settings apply instantly, with no Save button. The main panel uses `Radio`, `Switch` and `Slider` (§4.2); Background and Ambient screen keep the large wrapping PillTabs. Sub-pages (Location, Background, Ambient screen) keep Settings active in the sidebar and put the ghost "‹ Settings" back link above the panel (see `Glance States - Settings`, frame C).

| ID | Requirement |
|---|---|
| SET-01 | Header "Screen settings", "Settings", "Signed in as **{name}** · {email}". |
| SET-02 | **Season:** a vertical list of radios: Auto (`calendar-days`), Spring (`flower-2`), Summer (`sun`), Fall (`leaf`), Winter (`snowflake`), each radio, icon, label. "Follows the month · now {Season}" / "Fixed to {Season}". Auto re-checks at midnight. |
| SET-03 | **Background** row → Background page; summary "Season color" / "Photo · {title}" / "Slideshow · {interval}". |
| SET-04 | **Clock:** two radios on one line, "12-hour" and "24-hour" ("Used for every time on the screen"). |
| SET-05 | **Temperature:** two radios on one line, "Fahrenheit" and "Celsius", never wrapping ("Weather is shown without a unit letter"). Then the Notifications rows (NOTIF-08). Then, last, **Hide sidebar when idle:** a `Switch` on the right of the row, "After 15 seconds without a touch. Any tap brings it back." (SHELL-11). |
| SET-06 | Tile "Ambient screen" · its hours ("6:00 PM – 7:30 AM", "Sun – Thu 6:00 PM – 7:30 AM · Fri & Sat 9:00 PM – 9:00 AM", "Off"; a set with equal times reads "Not set") → SET-10. |
| SET-07 | **Back to Today after** and **Remove notes after:** each an eyebrow with a `Switch` on its right, then a tile with the value ("3 min" + "without a touch"; "7 days" + "after posting") and a `Slider` (1–15 min by 1; 1–30 days by 1) with end labels ("1 min" · "15 min"; "1 day" · "30 days"). Switch off = never: the slider is disabled, the value struck through, reading "Off · stays on the current view" / "Off · notes stay until deleted"; the last value comes back when it turns on. |
| SET-08 | Account card: initial, name, email; Photo storage (SET-13); the screen list (SET-12); "Sign in another device" (SIGNIN-15); then below a hairline the caption "This device or every device." (info icon) on the left and secondary "Sign out" (`log-out`) on the right → the Sign out dialog (SIGNIN-11); then Delete account (SET-14), Guide and Terms of Service (SET-15), each below its own hairline. |
| SET-09 | **Location** row, first: "Location" · "Sets the weather and the time zone" · "{city}, {state code} · {time zone name}" or "Not set" → **Location page** ("‹ Settings", white panel). Left: "Now set to" with the place and "{time zone name} · {clock}", or "Not set" · "Times follow this device’s own clock"; then "Change location" ("Set location" when unset) with the setup card (primary "Search") and its states. Right: a block "What the location sets" (see `Glance States - Settings`, frame C): Weather ("The forecast on Today, Weather and the ambient screen"), Time zone ("{zone} for the clock, Today, the calendar and event times"), a caption ("The clock and event times follow {zone}, even if this device is set to a different time." / "Until a location is set, times follow this device’s own clock.") and "Shared by every screen on this account". A place in the same zone saves and returns to Settings; another zone asks first (LOC-09). |
| SET-10 | **Ambient screen page:** "Schedule" Every night · Weekends differ · Off. Under it **Brightness** Full · Medium · Low (default Medium; AMB-06), shown when Off too since manual Ambient uses it, with "How bright the text is while dimmed. On screens that allow it, the backlight dims too." Weekends differ splits it into "Sun – Thu nights" and "Fri & Sat nights"; a night belongs to the day it starts, and a dim time before noon belongs to the night before. Modes keep both sets. Each set has TimeFields "Dims at" and "Wakes at" (with the length, past midnight when earlier); the picker has minutes 00 · 15 · 30 · 45. Equal times: "Same as dim time", the bar reads "Not set", and that set never runs. Off: "The screen stays bright all day and night.", right block "No ambient hours." / "Touch-to-wake and the idle timer work as usual." Right: "Over 24 hours", one noon-to-noon bar per set with the span dark, "After a touch it dims again when nobody has touched it for {n} min." (idle off → "After a touch it stays awake until the next ambient start."), and "Preview" (moon) → Ambient. |
| SET-12 | **Signed-in screens:** "{n} screens signed in" ("1 screen signed in"), rows: type icon (`monitor`, `tablet`, `smartphone`), name, caption "This screen" (first, marked with an accent dot) or "Active {n} min ago" / "Active {n} hr ago" / "Active yesterday" / "Active {Mon} {d}". Type from the browser that signed in: iPhone or Android phone → smartphone, iPad or Android tablet → tablet, else monitor. Name "{browser} {screen \| tablet \| phone}" (Chrome, Edge, Firefox, Safari), else "Screen", "Tablet", "Phone". Read-only. Read from the server when Settings opens; offline or on failure only this screen shows. |
| SET-13 | **Photo storage** (Account card, between the name row and the screen list): photos are limited per account, shared by every screen; the limit is set by the server, 5 GB by default. Eyebrow "Photo storage", then a tile (see `Glance States - Settings`, frames S, T): "{n} GB left" (under 1 GB in MB, "400 MB left") with "{used} GB of {limit} GB used" on the right, then a meter (fill = used ÷ limit; `role="meter"` with the used text as `aria-valuetext`). Below 90%: black fill and "Shared by every screen on this account." From 90%: `--danger` fill and `triangle-alert` "Almost full. Delete photos in Photos to make room." At the limit: "No space left", `--danger` fill, "Storage full. New photos can’t be added until some are deleted in Photos." Values round to 0.1 GB. Read from the server when Settings opens; offline or on failure the tile is hidden. An upload that would pass the limit fails as "Storage full" (PHOTO-08). |
| SET-14 | **Delete account:** a row below its own hairline: "Delete account" and "Erases every event, note, photo and family member for everyone, and signs out all screens." on the left, secondary "Delete account" (`trash-2`, label and icon in `--danger`) on the right. It opens a centered `alertdialog` over the scrim (a scrim tap or Escape cancels unless deleting): a `trash-2` on a `--danger` disc, the signed-in email as eyebrow, title "Delete account?", body "Everything saved to this account is erased for the whole family. This can’t be undone.", a tile listing what gets erased with live counts (Events, Notes, Photos, Family members, Signed-in screens), then a checkbox row "I understand everything will be erased for good." Buttons: `danger` "Delete account" (`trash-2`), disabled until the box is checked, and ghost "Keep account". **Deleting:** the checkbox row becomes "Erasing events, notes and photos. Keep this screen on.", the button reads "Deleting…", and both buttons and the scrim are locked. **Done:** the server erases the account's events, notes, photos and their files, family members, settings, screens and push subscriptions, and signs out every device (SIGNIN-18); this screen goes to the empty email form with the `Toast` "Account deleted. Everything on it has been erased." for 5 s. The same email can later sign up again as a new, empty account (SIGNIN-12). **Failed:** the deleting state ends and the dialog shows the Banner error "Couldn’t delete the account" · "Nothing was erased. Try again." with "Try again". Offline, the row's button is disabled. States U, V, W, X. |
| SET-15 | **Guide and Terms of Service:** the last two rows of the Account card, each below a hairline: "Guide" then "Terms of Service" on the left and `arrow-up-right` on the right; each whole row (at least 44 px) is a link that opens `/guide` (GUIDE-01) or `/terms` (TERMS-01) in a new tab. |
| SET-16 | **Family:** the Remove a member card (FAM-08) is in the right column, between the Schedule card and the Account card (SET-08). |
| BG-01 | "‹ Settings", "Background", Season color · Photo · Slideshow. |
| BG-02 | a thumb grid (see `Glance States - Settings`, frame B) + "Upload photo" tile; uploads behave as PHOTO-06/08. Offline: "Upload when online", disabled. Label "Family photos · select one" / "Family photos · all {n} in rotation". |
| BG-03 | In Season color, thumbs are faded (see `Glance States - Settings`, frame B); tapping one switches to Photo. |
| BG-04 | Right: Preview (mini layout on the current background), "Dim photo" Off · Light · Strong (0, 0.2, 0.4), "Change photo" Hourly · Daily · Weekly (Slideshow only). |
| BG-05 | Caption: "Screens use a plain light gray background. Pick a photo to switch." / "{title} is the background on every screen. Panels stay solid on top." / "Showing {title}. The photo changes {interval}; panels stay solid on top." |
| BG-06 | Photo background = the photo cropped to cover the screen under two stacked black layers, each at the dim value, cross-fading (§4.4). Slideshow goes in upload order, the next photo at each local hour, midnight or Sunday midnight. A tapped thumb shows now and the rotation continues from it; mode or interval changes keep the photo on screen. Photo mode with none picked shows the oldest upload. |

### 8.8 Ambient — `AMB`
One full-screen button, text on deep. No sidebar and no wordmark; the rows spread over the full height.

| ID | Requirement |
|---|---|
| AMB-01 | Top row: `map-pin` + the location's place on the left (the season icon + the season's name when no location is set); on the right at most one status: "Signed out · tap to sign in" (`log-out`) wins over the offline notice (OFF-05). |
| AMB-02 | Giant Clock (Ambient's own size, §4.3; see `Glance States - Settings`, Ambient, frame A). |
| AMB-03 | Weather: "{temp}° · {condition}" / "Low {low}° overnight · {day} {p}% rain" ({day} "Tomorrow" or "{Wkd}": the first of the next 6 days at ≥ 50%; none → the low alone); offline, "Updated {time}" under it. No location → no weather block. **Next event:** eyebrow "Next · Tomorrow · {start}" or "Next · {Wkd}, {Mon} {d} · {start}" (all-day reads "All day" and comes first), the title, then the location on its own line. None → eyebrow "Next event", "Nothing scheduled" and "Add events from Today" ("Add events and a location from Today" with no location). A due reminder takes over this slot (NOTIF-06). |
| AMB-04 | Bottom line "Tap anywhere to wake" ("Tap anywhere to sign in" when signed out), fading out 10 s after Ambient starts. A tap → Today (or the signed-out form). Named "Wake screen". |
| AMB-05 | Enters at the night's dim time and leaves at its wake time (only if Ambient is showing). Never when Off or "Not set". After a wake tap during hours it returns after the idle timeout; a screen that starts during hours gets there the same way. |
| AMB-06 | Background: season deep, or the photo background dimmed at least 0.6. **Brightness** (SET-10): text and icons are white (Full), `#dcdcdc` (Medium) or `#a3a3a3` (Low), solid colors, each at least 4.5:1 on every deep color. The backlight dims too only where the platform offers a way; browsers don't, so the text color is the whole effect today. |
| AMB-07 | Signed out during Ambient: it stays, with the signed-out status (AMB-01) and hint (AMB-04), the clock and saved weather; the next tap or the end of hours opens the signed-out form. |
| AMB-08 | The sidebar's Ambient item and SET-10 "Preview" open Ambient at once, outside the schedule too. |
| AMB-10 | **Transitions** (every way in and out, replacing the 280 ms fade). Entering: the current view dims to 25% brightness and scales to 98.5% (420 ms ease-in), then Ambient brightens in from 30% (700 ms ease-out) while its rows rise 16 px and fade in one after another (600 ms each, 120 ms apart, from 200 ms). Leaving: Ambient's rows fade out and lift 12 px (240 ms, 40 ms apart), then the next view brightens from 25% and 98.5% to full (520 ms). Taps during either transition are ignored. Reduced motion: switches at once. |
| AMB-11 | **Burn-in drift:** the four rows move together to the next of 8 offsets (each at most 6 px from the rest position on either axis) every 2 min, over 2 s ease-in-out; with reduced motion they jump at once. |

### 8.9 Sheets — `SHEET`
- Modal over the scrim (also over the sidebar); card sizes: see `Glance States - Photos`, frames J, K. Note sheets have their own shape (NOTE-02, NOTE-10).
- **Sticky header and footer** (Photo details; the event page has its task bar, EVT-05, and note sheets their own shape): the eyebrow, title and ✕ stay pinned at the top while the body scrolls, and the footer at the bottom. The header and footer shadows and the body's fill are the prototype's (Photo details). Note sheets keep the paper tone everywhere.
- Note sheets (details, New note, Edit note) show no shadow under the sticky header or above the sticky footer.
- An unchanged sheet closes at once on scrim, Cancel, ✕ or Escape.
- **Discard changes?** When the draft changed, those replace the footer with "Discard changes?", a line ("This note won’t be posted." · "Your edits to this photo won’t be saved."), secondary "Keep editing" (focused) and `danger` "Discard". While shown, the scrim is ignored and ✕ or Escape discards. An edit or "Keep editing" brings the footer back. The idle timeout discards without asking. The event page asks in its task bar instead (EVT-05).
- Sticky action row (Photo details): Delete left, Cancel + primary right. Note details has Delete and Edit; the note composer has no Cancel (NOTE-05).
- Offline banner "You're offline" on note sheets: "The note saves on this screen and posts when the connection is back." On Photo details: "Changes save on this screen and sync when the connection is back." The event page has no banner; its Save reads "Save for later" (EVT-05).
- Focus is trapped; opening focuses the sheet itself (no keyboard pops up), closing returns focus to the opener.

### 8.10 Event notifications — `NOTIF`
Reminders for upcoming events: a strip on the screen over any view, quietly on Ambient during quiet hours, and a push notification on phones and tablets when Glance is closed. Source: `Glance Notifications` (the strip is option 2a, the compact strip).

| ID | Requirement |
|---|---|
| NOTIF-01 | **When:** each timed event whose Notification is on (NOTIF-09) fires once, at the account's lead time before its start: 15 or 30 minutes (NOTIF-08). There is no reminder at the start. With the lead time Off nothing fires for any event: no strip, Ambient reminder, chime or push. All-day events have no reminder. Every signed-in screen shows it at the same moment; phones and tablets with Glance open show the strip, and closed ones get the push (NOTIF-07). |
| NOTIF-02 | **Missed and changed:** a screen that was offline or asleep shows a reminder once, if its event hasn't started yet, with the real time left ("In 6 min"); after the start it is skipped. Moving an event, changing its time or Notification, or deleting it cancels its pending reminder and schedules a new one; so does changing the lead time. |
| NOTIF-03 | **Strip** (`ReminderStrip`; sizes, colors and motion: `Glance Notifications`, option 2a): centered at the top, over every view, sheets and the drawer included. Row: `bell`, an eyebrow with the event's color dot: "In {n} min · {start} · {who} · {place}" ({n} the lead time, or the real time left, NOTIF-02; empty parts left out), the title (one line, "…"), then a "Details" button (`arrow-right`). A time-left line along the bottom empties over 30 s. It slides in and closes by itself after 30 s; there is no dismiss or snooze. A tap on the strip or Details → Event details. With reduced motion it appears and closes at once. |
| NOTIF-04 | **Groups:** reminders due in the same minute merge into one strip: eyebrow "In {n} min · {start} · {count} events", the titles joined by ", " (over 3: the first 2, then "+{n} more"), the dot in the season soft color (as shared events), and "See all" in place of Details → Today at that time. |
| NOTIF-05 | **Interruptions:** the strip never takes focus, closes a sheet or the keyboard, resets the idle timer or shows the hidden sidebar; taps on it are its own and everything under it keeps working. A new reminder replaces the one showing (no stack). **Chime:** plays once when the strip shows, when Settings › Chime is on, never during ambient hours. |
| NOTIF-06 | **Ambient:** during ambient hours there is no strip, chime or wake. Ambient's Next slot (AMB-03) becomes the reminder: `bell` and "In {n} min · {start}" as its eyebrow, then the title and "{who} · {place}"; from the start it reads "Now · {start} – {end}" until the event ends (no end: until its day ends), then the slot returns to the next event. Only events whose reminder fires take the slot (not with the lead time Off or the event's Notification off). Same brightness colors as the rest of Ambient. |
| NOTIF-07 | **Push** (phones and tablets that allowed it, NOTIF-08): a system notification, only while Glance is closed or in the background. Title "{event} in {n} min"; a group "{count} events in {n} min". Body "{start} · {who} · {place}", or for a group "{start} · {titles}". A tap opens Glance on Event details (a group: Today at that time). Each reminder is pushed once. The phone's own Do Not Disturb applies, not Glance's ambient hours. |
| NOTIF-08 | **Settings › Notifications** (rows of the main Settings panel, after Temperature and before Hide sidebar when idle; States - Settings A and A2): **Notifications**, a radio group in the Clock style (wrapping when narrow) named "Notifications for everyone": Off · 15 min before · 30 min before (default 15 min before; per account, one lead time for every event). Sub-line "{15\|30} min before each event, on this screen and on phones", or "Off for everyone, whatever each event is set to". The lead time applies to every event whose own Notification is on; Off overrides them all and stops the strip, the Ambient reminder, the chime and push on every device, and each event keeps its own setting for when a lead time is picked again. Then **Chime**, a `Switch` row "Plays once when a reminder shows. Never during quiet hours." (default on; per account). Then **This phone**, "Get reminders when Glance is closed.", only on devices that support push: secondary "Allow notifications" → the browser's permission prompt; once allowed it reads "On" with a ghost "Turn off". Blocked by the browser: "Notifications are off for Glance in this browser’s settings." in place of the button. Per device, never synced. While Notifications is Off, Chime and This phone keep their values but don't apply. |
| NOTIF-09 | **Notification** (event page, at the right end of the sentence card's second link row): on or off per event, no lead-time options (the lead time comes from NOTIF-08). Large and normal: a labeled switch then "Notification", `role="switch"` (see `Glance New Event`). Small: a `bell` (on) or `bell-off` (off) with no background in a 44 px tap area. Named "Notification on. Turn off" / "Notification off. Turn on". On for new events; saved events keep their value (missing = on). Changing it counts as a change for "Discard changes?". Not on Event details, which shows "Notification off" when it is off (EVT-09). |
| NOTIF-10 | **Not included:** no list of past notifications (Today and the Now panel show what is now and next), no reminder at the start, no dismiss, snooze, per-person reminders or per-event lead times. |

### 8.11 Terms of Service — `TERMS`

| ID | Requirement |
|---|---|
| TERMS-01 | **`/terms`** renders `Glance Terms of Service` for everyone, signed in or not, with no sidebar: a header with the "Glance" wordmark, "Source on GitHub" (→ `https://github.com/vespaiach/glance`) and, next to it (wrapping on small), the "Back to Glance" pill (`arrow-left`, at least 44 px tall) that opens `/` in the same tab (sign in when signed out, Today when signed in), the eyebrow "Legal", title "Terms of service", "Effective October 24, 2026", the "In short" cards (Free and open source, Your data, not encrypted, Provided as is, 18 and over), the 17 numbered sections (§05 "Weather data": the forecasts come from Open-Meteo under CC BY 4.0, credited wherever weather shows, WX-10), and the footer "Glance · takeaglance.app" · "MIT License". Words exactly as the page, from `copy.ts`, except that §11 Termination's cross-reference reads "Sections 7, 9 and 12–16" (the page still has the pre-§05 numbers). "How your data is stored" also says the content you enter is never sold or shared (only the hosting provider, or when required by law) and that Google Analytics receives usage data only, never that content (D36), and that when Glance runs into an error it sends an error report (the error, the page and the app version, never what you enter) to the Glance server, which keeps it in its logs (D37). One readable column at the three sizes; the page scrolls. Linked from the sign-in form (SIGNIN-19) and Settings (SET-15), both opening it in a new tab. |

### 8.12 Guide — `GUIDE`

| ID | Requirement |
|---|---|
| GUIDE-01 | **`/guide`** renders `Glance Guide` for everyone, signed in or not, with no sidebar: the header ("Glance" wordmark, the page's section links Get started · Using Glance · Screen sizes · FAQ, then the "Back to Glance" pill (`arrow-left`, at least 44 px tall) that opens `/` in the same tab (sign in when signed out, Today when signed in)), the hero ("Guide for families", "Your family’s day, at a glance." and its static preview), the 11 numbered sections from "Get started with one email" to "One app, any screen", then "Questions" (the first question open; each question is a button with `aria-expanded` that shows or hides its answer), and the footer ("Glance" and a "Terms of Service" link to `/terms`). Words exactly as the page, from `copy.ts`, except that 09 Reminders' first line reads "Choose when reminders come in Settings › Notifications: 15 or 30 minutes before, or off." (NOTIF-08; the page still has the old choices). Colors follow the month's season (Auto, by the UTC date), and 07's Season card shows Auto selected with "Follows the month · now {Season}". Text uses the app's type scale (§4.3), so body copy is 16 px and eyebrows 14 px where the page has 18. One readable column at the three sizes; the page scrolls. Linked from the sign-in form (SIGNIN-19) and Settings › Account (SET-15), both opening it in a new tab. |

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
- FAIL-04: **Crash screen:** when a view, Ambient, Sign in, the Guide or the Terms crashes outside a zone, the whole screen shows "Something went wrong", "Glance will reload in {n} s." (counting down from 60) and a "Reload" button, and it reloads on its own at 0. A crash inside a zone shows only that zone's failure (FAIL-01). Every crash is reported to the Glance server with no content the family entered.

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
- KB-02: sheets shrink above the keyboard (280 ms) and scroll inside; actions stay sticky. On the event page the page pads by the keyboard and scrolls; the task bar stays pinned.
- KB-03: full-page forms (Sign in email, name, location, Weather setup, Location card) pad by the keyboard and scroll the focused field 24 px below the top.
- KB-04: Return moves to the next field; Message adds a line; in the last field it submits a full-page form, or hides the keyboard in a sheet.

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
