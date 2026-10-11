# Handoff: Glance · lobby display (Today, Calendar, Weather, Notes, Photos, Settings, Ambient)

> **Superseded in part.** This README documents the earlier static mockup (`Glance Mockups - edit.dc.html`). The current source of truth is the fluid web app (`Glance.dc.html`) and `Glance - Behavior Notes.dc.html`. Where they differ, follow the web app: fluid layout with breakpoints (wide ≥ 1200, mid 1000–1199, narrow < 1000), 48 px nav buttons, Photos in the nav, Settings page, loading/offline/keyboard states.

## Overview
A 1920×1080 landscape touch display on a floor stand in an office lobby (sample site: Northwind HQ · Lobby, Portland, OR). It shows the time, today's schedule, weather, a notice board of sticky notes, a photo album, and an after-hours ambient screen. The palette follows the season. An optional photo background can sit behind every screen.

## About the design files
The files in this bundle are **design references built in HTML**. They show the intended look and behavior; they are not production code. Recreate them in the target codebase with its own framework and patterns. If there is no codebase yet, React + CSS variables is the natural fit, since the design system's components are React and its tokens are CSS custom properties.

The mockups are static: times, dates and data are hardcoded (Friday Oct 9 2026, 10:41 AM). Only the Settings › Background screen (2a) is interactive in the mock.

## Fidelity
**High fidelity.** Colors, type, spacing, radii and component usage are final. Build as a fluid web app that reflows by window width (see "Scaling"). The 1920×1080 measurements below describe the wide layout.

## Design system
Everything is composed from the **Kiosk Display Design System** (namespace `KioskDisplayDesignSystem_21b0bf`). Its tokens and compiled components are in `_ds/…/`. Port these components first; every screen is built from them:

| Component | Props used in this design |
|---|---|
| `Clock` | `time` (omit in production → live, ticks every 1 s), `size` `xl` (default), `showDate` (default true) |
| `EventRow` | `start`, `end`, `title`, `location`, `status` `past|now|upcoming`, `dot` (CSS color) |
| `MonthGrid` | `year`, `month` (0-based), `today`, `selected`, `marked[]`, `showTitle=false`, `cell=72`, `onSelect` |
| `Button` | `variant` `primary|secondary|ghost`, `size` `md|lg`, `icon`, `iconRight` |
| `IconButton` | `icon`, `variant` `soft|canvas`, `size` `md(40)|touch(56)|lg(72)`, `label`, `active` |
| `PillTabs` | `options[]`, `value`, `onChange`, `size=lg` |
| `TextInput` | `size=lg`, `multiline`, `rows`, `label`, `placeholder`, `value`, `onChange`, `error` |
| `TopBar` | `brand`, `right`, `height` |
| `ColorBlock` | `tone` `1|2|3|4|soft|deep|canvas`, `padding` (default 48), `radius` (default 24) |
| `WeatherNow` | `location`, `temp`, `condition`, `icon`, `high`, `low`, `feelsLike`, `details[]`, `tone` (default 3) |
| `ForecastDay` | `day`, `icon`, `high`, `low`, `precip`, `active`, `onClick` |
| `Banner` | `icon`, `title`, `body`, `tone` |
| `StickyNote` | `tone` `1|2|3|4|soft`, `rotate` (deg), `author`, `time`, `width`, `minHeight`, children = text |
| `Eyebrow` | children (mono, uppercase via CSS) |
| `Icon` | Lucide `name`, `size`, `strokeWidth` (default 1.75) |

Component internals (exact sizes per state) are in `_ds/…/_ds_bundle.js`; that file is the source of truth for anything not restated below.

---

## Global frame (every screen except Ambient)
- **Canvas:** 1920×1080, `display:flex; flex-direction:column; overflow:hidden`. Root carries `data-season="spring|summer|fall|winter"`.
- **Background:** `--surface-canvas` (#fff), or the photo background when enabled (see Background).
- **Content area (`main`):** `flex:1`, padding `48px 48px 0` (photo mode: `48px 48px 24px`). Available height: 1080 − 72 (bar) − 48 = 960 px (936 px in photo mode). Columns separated by a 24 px gap.
- **Navigation bar** (TopBar component, **placed at the bottom** of the screen, after `main`):
  - Height 72 px, padding `0 48px`, background white, `brand=""` (no wordmark), center slot empty.
  - Right-aligned cluster, 12 px gap: a `nav` of 5 `IconButton`s (8 px gap) then a Settings `IconButton`.
  - Views and Lucide icons: Today `house`, Calendar `calendar-days`, Weather `cloud-sun`, Notes `sticky-note`, Photos `image`, Settings `settings`.
  - IconButton 48×48 (icon 18 px), variant `soft` (#f7f7f5 fill, black icon). Current view: `active` → black fill, white icon. On Settings, no view is active and the gear is active.
  - Each button has `aria-label`/`title` = view name.
- **No ticker** in this version (the DS Ticker exists; ticker copy is defined in the mock data but not rendered).

### Scaling
Do not scale a fixed canvas. Lay out fluidly and re-evaluate on resize: wide ≥ 1200 and mid 1000–1199 fit one screen; narrow < 1000 stacks into a single scrolling column. Type and gutters use `clamp()` (see the CSS variables on the web app root).

### Season
- `data-season` swaps the semantic block set. Roles: block-1 = hero/now, block-2 = notes, block-3 = weather, block-4 = highlight, soft = calm panels, deep = ambient, accent = alerts.
- "Auto" maps month → season: Mar–May Spring, Jun–Aug Summer, Sep–Nov Fall, Dec–Feb Winter. Mock default: Fall.
- Season label + icon (used on Today hero and Ambient): Spring `flower-2`, Summer `sun`, Fall `leaf`, Winter `snowflake`. Label text: `"{Season} · {Month}"`, e.g. "Fall · October".
- Season change: all color blocks cross-fade background 600 ms `cubic-bezier(.6,0,.3,1)` (built into ColorBlock / WeatherNow / StickyNote).

---

## Screens

### 1a · Today (three columns) — `data-screen-label="1a Today"` — **chosen Today layout**
Purpose: glanceable "what's on now" from across the lobby.
Grid: `600px | minmax(0,1fr) (=616px) | 560px`, gap 24.

**Column 1 — Hero** `ColorBlock tone=1` (Fall amber #f0c987), padding 48, radius 24, full height, flex column `space-between`.
- Top group (gap 24):
  - Season chip row (gap 10): `Icon` season icon 24 px + mono label 18 px / 0.54 px / uppercase — "Fall · October".
  - `Clock` xl: date line mono 18 px uppercase ("Friday, October 9"), 16 px gap, time 168 px / 300 / lh 0.9 / −6 px tabular ("10:41"), 12 px gap, AM/PM mono 28 px.
- Middle group (gap 16): `Eyebrow` "Happening now"; title 64 / 340 / lh 1.05 / −0.96 px ("Design review"); meta 24 / 330 ("Room 4B · until 11:15").
- Bottom: mono 18 px uppercase location "Northwind HQ · Lobby".

**Column 2 — Schedule** (no panel, sits on canvas), flex column gap 16.
- Header row (padding 8px 0, space-between): `Eyebrow` "Today · 5 events" + `Button ghost iconRight=arrow-right` "Full calendar".
- 5 × `EventRow` (see EventRow spec below).
- **Picture of the day** card: fills remaining height, margin-bottom 24, `--surface-soft` (#f7f7f5), radius 24, padding 16, grid `minmax(0,1fr) | 200px`, gap 20.
  - Left: image, radius 8, `object-fit: cover`.
  - Right (padding 8 8 8 0, space-between): `Eyebrow` "Picture of the day"; title 26 / 540 / −0.26 px / lh 1.2 ("Cannon Beach at low tide"); caption mono 14 px / 0.6 px uppercase ("Sep 6 · by Maya").

**Column 3 — Weather + notes**, flex column gap 24.
- `WeatherNow` tone 3 (Fall sage #d6dcc0): location "Portland, OR", temp 64, "Partly cloudy", icon `cloud-sun` 112 px stroke 1.25, "H 68° · L 51° · Feels like 62°". No details row.
- Header row: `Eyebrow` "Notes" + `Button ghost` "All notes" →.
- Two `StickyNote`s, 250×190 min, row gap 20, padding 0 8px (first two notes in the list).

### 1c · Calendar
Grid `640px | minmax(0,1fr)`, gap 24.
- **Left** `ColorBlock tone=soft`, padding 48, flex column gap 32.
  - Header: month name 64 / 340 / −0.96 px / lh 1.1 ("October"); two `IconButton canvas touch` (56 px) `chevron-left` "Previous month", `chevron-right` "Next month", gap 12.
  - `MonthGrid` cell 72, no title. Weekday header mono 12 px. Day cells: 72 px circles, 6 px gaps, numerals 24 px (`cell × 0.34`). Selected: black fill, white text, 540. Today (not selected): 2 px inset black ring, 540. Others 340. Days with events: 6 px accent dot (Fall ember #e0472a) at bottom 10 px; white dot when selected.
- **Right** (padding 16 0, gap 24): `Eyebrow` "5 events" (count for selected day; "No events" when 0); heading 86 / 340 / −1.72 px "Friday, Oct 9" (`{Weekday}, {Mon} {d}`); EventRow list for the selected day.

### 1d · Weather
Grid `720px | minmax(0,1fr)`, gap 24.
- **Left** `WeatherNow` full height, space-between, location "Portland, OR · Now", with 4 details: Wind 8 mph NW, Humidity 62%, UV index 3 (`sun`), Sunset 6:42 PM. Detail label mono 12 px with 16 px icon; value 28 / 480 / −0.4 px; row has 1 px top border rgba(0,0,0,.12).
- **Right** flex column gap 24:
  - `Banner tone=soft` icon `cloud-rain` 28 px: title 20/540 "Rain moving in after 4 PM", body 16/330 "Umbrellas are available at the front desk." Radius 8, padding 16 24. Show only when an alert-worthy change is forecast (rule TBD, see Open questions).
  - `Eyebrow` "Next 8 hours" + 8-column grid gap 8. Tile: #f7f7f5, radius 8, padding 20 8, centered column gap 14: mono 14 px time ("11 AM"), icon 36 px stroke 1.5, temp 28 / 480 / −0.4 px ("64°").
  - `Eyebrow` "7-day forecast" + `ColorBlock soft` padding 16, 7-column grid gap 8, of `ForecastDay`: mono 18 px day, icon 48 px stroke 1.5, high 32/480, low 20/330, precip mono 12 px with `droplet` 12 px (only when precip given). Today = `active` (white tile, radius 8).

### 1e · Notes (notice board)
Flex column gap 32.
- Header (space-between, align bottom): `Eyebrow` "5 notes" + heading 86/340 "Notice board"; `Button lg icon=plus` "Add note" (black pill, 64 px min height, 24 px text, padding 16 32).
- Board: wrapping flex, gap 40, padding 8 12, `StickyNote` 300×240 min. Note: padding 24, radius 6, shadow `0 4px 16px rgba(0,0,0,.06)`, text 24/400/lh 1.3/−0.3 px, footer mono 12 px uppercase author left / time right.
- Tones and rotations cycle by index: rotate `[-2, 1.5, -1, 2.5, -1.5]`; tone is chosen by the author.
- Overflow: board is `overflow:hidden`; behavior when notes exceed the space is not designed (see Open questions).

### 1f · Add note sheet (modal over 1e)
- Scrim: absolute inset 0 over the **whole** frame including the bar, `rgba(0,0,0,.6)`, content centered.
- Sheet: 760 px wide, white, radius 32, padding 48, shadow `0 24px 64px rgba(0,0,0,.18)`, flex column gap 24.
  - Title 64/340 "New note".
  - `TextInput lg multiline rows=3` label "Message", placeholder "Leave a note for the team".
  - `TextInput lg` label "Your name", placeholder "Optional".
  - Color row (gap 16): label 20/330 "Color"; 5 swatches 56 px circles, gap 12: block-1, block-2, block-3, block-4, soft. Selected: ring `0 0 0 3px #fff, 0 0 0 5px #000`. Default: block-1.
  - Actions right-aligned, gap 12: `Button lg secondary` "Cancel" (white with 1 px hairline inset shadow), `Button lg primary` "Post note".
- Inputs: 1 px #e6e6e6 border, radius 8, padding 18 20, 24 px text. Focus: border black + 2 px black ring. Error: #d92d20 border/ring + mono 12 px uppercase message below.

### 1h · Photos (family album)
Grid `minmax(0,1fr) | 640px`, gap 24.
- **Left** `ColorBlock soft` padding 32, flex column gap 32: featured image (fills, radius 8, cover); footer row (space-between, bottom-aligned, gap 24): `Eyebrow` "Sep 27 · Sauvie Island" + title 64/340 "Apple picking"; controls `IconButton canvas touch` × 3: `chevron-left` "Previous photo", `pause` "Pause slideshow", `chevron-right` "Next photo", gap 12.
- **Right**: header (padding 8 0): `Eyebrow` "Family photos · 6 new" + ghost "All albums" →. 2-column grid, equal rows, gap 16, padding-bottom 24. Each item: image (radius 8) + row (title 18/540 ellipsis, date mono 14 px uppercase). The photo currently featured gets the selected ring `0 0 0 3px #fff, 0 0 0 5px #000`.

### 1g · Ambient (after hours)
No nav bar, no panels. Background `--surface-deep` (Fall bark #3b2418), text white. Padding 96 96 64, flex column space-between.
- Top row (baseline): wordmark "Kiosk" 32/540/−0.8 px; right cluster gap 32: season icon 72 px stroke 1.25 + mono 18 px "Fall · October" (gap 12), mono 18 px "Northwind HQ · Lobby".
- Center: `Clock` at **1.9×** (mock uses CSS `zoom:1.9`; implement as real sizes: time ≈ 319 px, AM/PM ≈ 53 px, date ≈ 34 px). Time shown: 7:12 PM.
- Bottom: 2-column grid gap 24, 1 px top border rgba(255,255,255,.2), padding-top 32.
  - Left (gap 24): `cloud-rain` 72 px stroke 1.25; "56° · Light rain" 64/340; "Low 51° overnight · Sat 80% rain" 20/330 (Oct 9 is a Friday; tomorrow is Saturday).
  - Right: mono 18 px "Next event"; 40/340/−0.6 px "Wed, Oct 14 · 11:00 AM · All hands, Auditorium" ("Tomorrow · …" when it is the next day; "Nothing scheduled" when none).
- Any tap wakes the display and returns to Today.

### 2a · Settings › Background
Grid `minmax(0,1fr) | 640px`, gap 24. Gear is active in the nav bar.
- **Left** white panel (radius 24, padding 48, gap 32):
  - `Eyebrow` "Display settings" + heading 86/340 "Background".
  - `PillTabs lg` on #f7f7f5: "Season color" · "Photo" · "Slideshow". Selected tab black/white; 180 ms transition.
  - `Eyebrow` grid label: "Family photos · tap to use" (Season color, Photo) or "Team photos · all 6 in rotation" (Slideshow).
  - 4-column grid gap 20 of photo thumbs (16:9, radius 8, cover) + title 18 px ellipsis. Selected thumb: ring `0 0 0 3px #fff, 0 0 0 5px #000`, title 540 (others 330). In Season color mode all thumbs at 50% opacity and none selected. Press: scale .97, 120 ms.
  - Last tile: "Add from phone", 16:9 hairline outline tile with `plus` 32 px (behavior TBD).
- **Right** `ColorBlock soft` padding 32, gap 32:
  - `Eyebrow` "Preview" + 16:9 mini layout (radius 8, padding 16 16 0, grid `3fr 4fr 3fr` / `1fr 20px`, gap 8): block-1 / white / block-3 tiles (radius 6) and a full-width white strip for the bar, over the current background. Cross-fades 600 ms.
  - `Eyebrow` "Dim photo" + `PillTabs lg` on white: "Off" · "Light" · "Strong".
  - Only in Slideshow: `Eyebrow` "Change photo" + `PillTabs lg`: "Hourly" · "Daily" · "Weekly".
  - Caption pinned to bottom, 20/330/lh 1.4:
    - Season color: "Screens use the plain seasonal palette. Pick a photo to switch."
    - Photo: "{Photo title} is the background on every screen. Panels stay solid on top."
    - Slideshow: "Showing {Photo title}. The photo changes {hourly|daily|weekly}; panels stay solid on top."

### 2b · Today on photo · 2c · Calendar on photo
Same layouts as 1a and 1c with these differences when a photo background is on:
- Frame background = photo with dim overlay; `main` bottom padding 24 so the photo shows above the bar.
- Zones that sat directly on the canvas get a **white panel** (radius 24): Today schedule column (padding 16 24, gap 8) and Notes area (padding 16 24 24, gap 12, notes gap 12); Calendar day column (padding 40 48).
- 2b drops the Picture of the day card (schedule panel holds header + events only).
- Color blocks, WeatherNow and the nav bar stay solid.

### 2d · Ambient on photo
As 1g, but background = photo with dim overlay of `max(chosen dim, 0.5)`; top-right shows the photo title (mono 18 px) instead of the season chip; divider rgba(255,255,255,.4).

---

## Shared element specs

**EventRow** — grid `120px 16px minmax(0,1fr) auto`, column gap 24, padding 24, radius 8.
- Time: mono 20 px start; mono 12 px "– {end}" below.
- Dot 16 px circle in event color. Mock colors: Lunch & learn = block-2, Fire drill = accent (alerts only), Client visit = block-3, default block-4.
- Title 26/540/−0.26 px/lh 1.25; location 16/330.
- `upcoming`: transparent, 1 px bottom divider #f1f1f1.
- `now`: block-1 fill, no divider, black pill "NOW" (mono 14 px, padding 6 14) at right.
- `past`: title weight 340 with line-through, grey dot (#e6e6e6).
- Times are 12-hour without AM/PM in the row ("10:30", "1:00"). Ranges use an en dash.

**Buttons** — every text button is a pill (radius 50). md: padding 10 20, 20 px / 480, min height 44, icon 20. lg: padding 16 32, 24 px, min height 64, icon 26. Ghost = transparent. Disabled = 35% opacity.

**Press feedback (all tappables)** — `transform: scale(.97)` on pointer down, 120 ms `cubic-bezier(.2,.7,.2,1)`; released on pointer up/leave. No hover states. Fills never darken.

---

## Interactions & behavior

### Navigation
- Nav bar icon → switch view. Screen change 280 ms (fade; no slide specified).
- Today "Full calendar" → Calendar (selected = today). "All notes" → Notes. Tapping the WeatherNow card → Weather (as in the DS kit).
- Photos "All albums" → album list (not designed).
- Settings gear → Settings. Only the Background page is designed.
- Persist last view; but see idle timeout below.

### Time-driven updates
- Clock ticks every second (Clock without `time`).
- Event status recomputed every minute: `past` if end ≤ now, `now` if start ≤ now < end, else `upcoming`.
- Hero "Happening now" shows the `now` event: title, `{location} · until {end}`. If none is running: not designed (see Open questions). If the day is empty, use the DS empty copy "Nothing scheduled. Rooms are open for booking at the front desk."
- Eyebrow counts update with data: "Today · {n} events", "{n} events", "{n} notes".
- Season "Auto" re-evaluates at midnight.

### Calendar
- Tap a day → `selected`, right column shows that day's events; heading and count update. Today keeps its ring.
- Chevrons change month; `today` ring and event dots only shown for days with data in that month. Selected day for other months is not specified (suggest: 1st of month).
- EventRows on non-today days always render `upcoming`.

### Weather
- Data needed: current (temp, condition, icon, high, low, feels like, wind, humidity, UV, sunset), 8 hourly points, 7 days (high, low, icon, precip %). Degrees shown without unit letter.
- Condition → Lucide icon: sun, cloud-sun, cloud, cloud-drizzle, cloud-rain, cloud-snow, cloud-lightning.
- Forecast day tap: `onClick` is a no-op in the mock (detail view not designed).

### Notes
- "Add note" opens the 1f sheet. Tap the scrim or "Cancel" → close and discard.
- "Post note": requires a non-empty trimmed message (button does nothing otherwise; error copy not designed). Name optional → "Guest". Time → "Just now". Rotation from the cycle. New note goes first. Sheet closes and fields reset.
- On-screen keyboard: needed on a kiosk; not designed.

### Photos
- Slideshow auto-advances (interval not specified); pause toggles to play (`play` icon, label "Play slideshow"). Chevrons step and pause? Not specified. Tapping a thumbnail features it.

### Background (2a)
- Mode tabs: Season color / Photo / Slideshow.
- Tapping a thumb selects it; if mode is Season color it switches to Photo.
- Dim overlay alpha: Off 0, Light 0.2, Strong 0.4. Ambient uses `max(alpha, 0.5)`. Mock applies it as a flat black layer over the photo (`linear-gradient(rgba(0,0,0,a), rgba(0,0,0,a)), url() center/cover`).
- Rotate (Slideshow only): Hourly / Daily / Weekly.
- Background change cross-fades 600 ms ease-in-out on every screen and in the preview.
- Setting applies to all screens and persists.

### Ambient
- Entry rule (after-hours schedule and/or idle time) is not specified. Tap anywhere to wake to Today.

### Motion summary
Press 120 ms ease-out · tab/tile state 180 ms · screen change 280 ms · season/background 600 ms ease-in-out. No bounces.

---

## State
- `view`: Today | Calendar | Weather | Notes | Photos | Settings (+ `ambient` flag).
- `seasonSetting`: auto | spring | summer | fall | winter → resolved `season`.
- `background`: `{ mode: 'season'|'photo'|'slideshow', photoId, dim: 'off'|'light'|'strong', rotate: 'hourly'|'daily'|'weekly' }` (mock default: photo, coast, light, daily). Persist.
- Calendar: `month`, `selectedDay`.
- Notes: `notes[]` `{id, text, author, time, tone, rotate}`; sheet `{open, text, name, tone}`.
- Photos: `photos[]` `{id, title, date, place?, src}`, `featuredId`, `playing`.
- Data feeds: events (calendar source), weather, notes store, photos store, site name/location.

## Design tokens
**Type:** Geist (sans) and Geist Mono, variable, Google Fonts. Roles used: clock 168/300/0.9/−6 px; temp 144/300/0.9/−5 px; display-xl 86/340/1.0/−1.72 px; display-lg 64/340/1.1/−0.96 px; condition 40/340/−0.6 px; headline 26/540/1.35/−0.26 px; body-lg 20/330/1.4; body 18/320/1.45; body-sm 16/330/1.45; button 20/480 (lg 24); eyebrow mono 18/400/1.3/0.54 px uppercase; caption mono 12/400/1.0/0.6 px uppercase. Numerals tabular.

**Core colors:** black #000, white #fff, hairline #e6e6e6, divider #f1f1f1, soft surface #f7f7f5, scrim rgba(0,0,0,.6), danger #d92d20, success #1ea64a.

**Seasons** (block-1 / block-2 / block-3 / block-4 / soft / deep / accent):
- Spring: #dceeb1 / #efd4d4 / #c8e6cd / #c5b0f4 / #f4ecd6 / #1f1d3d / #ff3d8b
- Summer: #f6e3a1 / #f3c9b6 / #bfdff0 / #dceeb1 / #f4ecd6 / #0e3a46 / #ff6b2c
- Fall: #f0c987 / #e3a684 / #d6dcc0 / #f3c9b6 / #f4ecd6 / #3b2418 / #e0472a
- Winter: #d5e4f1 / #c5b0f4 / #b9cde6 / #c8e6cd / #e9edf3 / #16213d / #3d63ff

**Spacing:** 1, 4, 8, 12, 16, 24, 32, 48, 96. Screen gutter 48, column gap 24.
**Radii:** 2, 6 (sticky notes, preview tiles), 8 (inputs, tiles, images), 24 (blocks, panels), 32 (modal), 50 (pill buttons), 9999 (icon buttons, day cells, swatches).
**Shadows:** L1 `inset 0 0 0 1px #e6e6e6`; L2 `0 4px 16px rgba(0,0,0,.06)` (sticky notes); L3 `0 24px 64px rgba(0,0,0,.18)` (modal). Selected ring `0 0 0 3px #fff, 0 0 0 5px #000`. Never shadow a color block.
**Touch:** min 44 px, kiosk 64 px; icon buttons 40 / 56 / 72.

## Assets
- Icons: Lucide 0.460.0 (`https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js`), stroke 1.75 default, 1.25–1.5 at large sizes, round caps.
- Photos: placeholders from picsum.photos (seeded). Replace with the real photo store.
- No logo provided; the product name "Glance" is set in Geist 540 (sign-in hero; Ambient in the static mockup).
- Fonts: Geist substitutes for proprietary figmaSans/figmaMono in the source reference.

---

## Review notes (resolve during build)
1. **Nav targets** were 40 px in the static mockup; the web app uses 48 px. 56 px (`size="touch"`) still fits the 72 px bar if more room is wanted.
2. **Icon-only nav** has no visible labels. Consider labels or a PillTabs bar for first-time users.
3. **Blocks touch the bar.** In 1a–1h `main` has 0 bottom padding, so full-height blocks end flush against the bar (the photo variants use 24 px). Confirm intended; 24 px would match the gutter system.
4. **Today:** 1a is the chosen layout. 1b in the HTML file is a rejected alternative; ignore it.
5. **Photo mode** is only drawn for Today, Calendar and Ambient. Weather, Notes, Photos and Settings on a photo need the same "wrap bare zones in white panels" rule applied.
6. **Ambient clock** uses CSS `zoom`; implement with explicit sizes.
7. **Accent usage:** the guide allows one accent per screen. Calendar uses accent for every event dot in MonthGrid and for the fire-drill dot; fine as a data color, but don't add accent CTAs to these screens.
8. **Color swatches in 1f** are plain spans in the mock; build them as buttons with `aria-label` (e.g. "Amber") and `aria-pressed`.
9. **Season chip** in Today hero duplicates info from Ambient; fine, but on Today it competes with the date line. Keep or drop by preference.
10. The hero "Happening now" and the `now` EventRow both use block-1. On 1a they sit side by side in the same color; acceptable but check legibility of the row against the white column.

## Open questions (not designed)
- No current event: what the hero shows (suggest "Up next" with the next event, or the empty copy).
- Loading, offline and stale-data states for calendar and weather.
- Weather banner trigger rules.
- Ambient schedule (hours) and idle timeout back to Today.
- Note moderation, expiry, max count, overflow/paging on the board, delete.
- On-screen keyboard for the add-note sheet.
- "Add from phone" flow (QR pairing, upload?).
- Photos slideshow interval; behavior of chevrons while playing; "All albums" screen.
- Other Settings pages (season override etc.); the DS kit has a SettingsSheet for season.
- Portrait layout.

## Files
- `Glance Mockups - edit.dc.html` — all screens. Turn 2 (top) = photo background (2a–2d); turn 1 = base screens (1a–1h, 1g). Open in a browser alongside `support.js`, `image-slot.js` and `_ds/`.
- `_ds/kiosk-display-design-system-…/` — tokens (`tokens/*.css`), `styles.css`, compiled components (`_ds_bundle.js`).
- Mock data (events, notes, weather, photos) is in the `<script data-dc-script>` block at the end of the HTML file.
