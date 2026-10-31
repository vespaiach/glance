# Handoff: Glance · responsive web app

Glance is a responsive web app; it can run on desktops, laptops, tablets, and phones. It can be used as smart wall family calendar.

## Start here
1. **`app.dc.html`** is the clickable mockup and the source of truth for layout, copy, states and component usage. Open it in a browser (keep `support.js`, `_ds/` and `emails/` next to it). Navigation, sheets, settings, calendar, photos and the background picker all work.
2. **The layout pages** (`today-layout.dc.html`, `calendar-layout`, `event-layout`, `note-layout`, `photo-layout`, `account-layout`, `settings-layout`, `ambient-layout`) show each view Full, Empty and Loading at large 1920×1080, normal 1024×768 and small 390×844 (size and state pickers at the top). `shared-components.dc.html` is the component library.
3. **`app-notes.dc.html`** covers app logic and behavior: interactions, timers, offline and keyboard behavior, components, data needed, mock data to replace and URL parameters. Items marked **Mock** need a real implementation.

## About the files
These are design references built in HTML, not production code. Rebuild them in the target codebase. If there is no codebase yet, React + CSS custom properties fits best: the design system's components are React and its tokens are CSS variables.

## Design system
Built only from the bound design system (`_ds/…/`, namespace `KioskDisplayDesignSystem_21b0bf`). Port these first:
- Tokens: `tokens/*.css` (colors, seasons, type, spacing, radii, shadows, motion).
- Components: Clock, Button, IconButton, PillTabs, TextInput, ColorBlock, WeatherNow, ForecastDay, Banner, StickyNote, MonthGrid (small-screen date picker only), EventRow (sign-in preview only), Eyebrow, Icon. Internals are in `_ds_bundle.js`.
- Icons: Lucide 0.460.0, stroke 1.75 (1.25–1.5 at large sizes).
- Fonts: Geist and Geist Mono (substitutes for the proprietary fonts in the source reference).

## Layout
- Not a scaled canvas. Three screen sizes by window width (`Component.SMALL_MAX` = 768, `Component.NORMAL_MAX` = 1200): **large** (> 1200 px) and **normal** (769–1200 px) fit one screen and share the large layout unless the notes say otherwise; **small** (≤ 768 px, the phone layout) stacks into one scrolling column. Small-screen specifics are in the behavior notes.
- Type and gutters use `clamp()`. The exact values are the CSS variables on the app's root element in `app.dc.html` (`--type-*` and the gutter variable).
- Per-view grid templates are in the `layout(view, SM)` and `fitLayout(view, SM)` methods (`SM` = small) of the logic class.
- Navigation: left sidebar, the only navigation. An 80 px icon rail (Today, Calendar, Weather, Notes, Photos; Ambient and Settings at the bottom; an X last that hides the rail to a grip). Today opens with the rail hidden (grip only); any other view brings the rail back. The expand handle opens a 320 px drawer with labelled rows and a “Close” row pinned at the bottom. Taps outside go to the page; rail and drawer close with their X, or by themselves after 15 s with no touch (Settings › Hide sidebar when idle). On small screens there is no rail: the edge grip opens the full drawer over a scrim, and closing returns to the grip. Hidden on Sign in and Ambient.
- Today: Now panel layout. Grid templates are in `todayLay(SM)`. Normal: two columns, two rows (Now panel + schedule, then notes + Today’s photo). Large: three columns, the Now panel (clock, weather now, current or next event with a countdown) at full height, the schedule in the middle, notes over Today’s photo on the right. Small: one scrolling column (Now panel, schedule, notes, Today’s photo). No separate weather card. Today’s photo (was “Picture of the day”) keeps a fixed 4:3 frame and the notes panel takes the rest of the column; tapping it opens Photos with that photo featured and the slideshow paused. Its pick, states and the large-screen “Add from your phone” panel are in the `potdV` / `potdShow` / `potdAct` values in `renderVals()`. Below 1440 px the schedule's “Add event” and “Full calendar” buttons are icon-only. The schedule is the same elastic day timeline as Calendar, for everyone. With nothing running or coming up today, the Now panel shows the open-day state: “The day is wide open” (or “That’s a wrap for today”), a 6 AM – 10 PM day ribbon with a clock marker at now and a sunset tick, and a “Next on the calendar” tile that opens Calendar.
- Calendar: week strip, person filter and an elastic 5 AM–9 PM day timeline with a weather lane. The timeline is built in the `tlBuild` function in `renderVals()`; event colors come from the people in `Component.PEOPLE`. Small screens show the day as a list instead of the timeline (see `calendar-layout.dc.html`, small screen).
- Photo background: every zone with text sits on a white panel (radius 24). Color blocks and the sidebar stay solid.

## Data needed
- **Events:** id, start timestamp, end timestamp (optional: “No end time”), all-day flag, title, where (place), who (member ids, may be empty), notes, reminder (off | at start | 15 min | both; planned). No color: it comes from who.
- **Members:** id, name, color (one of 12). Created from an event’s Who field only.
- **Weather:** current (temp, condition, high, low, feels like, wind, humidity, UV, sunset), 8 hourly points, 7 days (high, low, condition, precip %).
- **Notes:** id, text, author, created time, rotation (no color; notes always use the season paper tone).
- **Photos:** id, title, date, place, image.
- **Location** (one per account): place name, state, coordinates and its time zone. Sets the weather and every displayed time. Unset = device clock.
- **Account:** one family = one account = one email. Stores the person's name and email. Screen label is "Glance".
- **Settings** (persisted): season (Auto or a fixed season), clock 12/24 h, °F/°C, background `{mode, photoId, dim, rotate}`, idle timeout, note expiry, default reminder and chime (planned). Push on/off is per device, not per account. Ambient schedule `{mode: same|split|off, all: {start, end}, wknd: {start, end}}` (minutes of the day; `wknd` = Fri & Sat nights when split; end earlier than start = next morning; start ≠ end). Default every night 6:00 PM – 7:30 AM; weekend default 9:00 PM – 9:00 AM.

## Mock data to replace
Mock data is in the `<script data-dc-script>` block at the end of `app.dc.html`. These values are hardcoded in it:
- The date and time (Fri Oct 9 2026, 10:41 AM; Ambient 7:12 PM).
- The family: 9 starter members with fixed colors (`Component.PEOPLE`, copied into `state.people`; new members are added from the Who field), and events with `who` and `notes`.
- Hourly forecast for today and tomorrow (`Component.HOURLY`) and daily highs (`Component.DAILY`).
- The weather condition and icon ("Partly cloudy"), plus Ambient's "Light rain" and "Tomorrow 80% rain".
- Event times are minutes of the day on a fixed Oct 2026 date, not real timestamps. Production stores moments in time and shows them in the location's time zone.
- Time zones: a small state → zone table and a fixed offset from Pacific (October values). Production needs a real place → time zone lookup.
- Use my location: no real device location; it always finds Portland, OR after 2.6 s (`geo=` forces a failure).
- "Maria", "maria@example.com" (the known account), the sign-in code check (000000 is wrong, any other code is right) and expiry, upload progress and place search.
- Photos come from picsum.photos (seeded). Uploads are local to the tab, progress is simulated.

## Leftover code to drop
- The Family sheet (`openFamily`): nothing opens it.
- The bottom bar from an earlier navigation: `NAVP` is fixed to `left`; `nav.bottom`, the TopBar mount, `barMode`, `barTimer`, `BAR_IDLE` and `bar=` are unused. `barAuto` stays (Hide sidebar when idle).
- Alternate event page looks (`evlook=`); only `cards` is the design.

## Not designed
Details are in the behavior notes:
- Recurring and multi-day events, and calendar-source sync (Google/Outlook).
- Weather refresh interval, alert banner trigger rules and forecast-day detail.
- Note ownership and moderation.
- Photo albums; phone upload, storage and reverse geocoding need real services.
- A guided setup that chains location → first event → photos.
- Session expiry (sign-ins don't expire in v1) and kiosk lock.
- Multi-screen management and roles (who can change Settings).
- Accessibility: focus order inside sheets.

## Files
- `app.dc.html` — the clickable mockup. URL parameters that open any state are listed in the notes (URL parameters).
- `event-page.dc.html` — the event page (New event, Edit event, Event details), mounted by `app.dc.html`. Keep it next to it.
- `*-layout.dc.html` (today, calendar, event, note, photo, account, settings, ambient) — each view at every size, Full, Empty and Loading.
- `shared-components.dc.html` — component library.
- `notifications-widget.dc.html` — event reminders on the display and as push notifications.
- `app-notes.dc.html` — logic, behavior, components, data and mock notes.
- `guide-layout.dc.html`, `terms-layout.dc.html` — user guide and terms, linked from Sign in and Settings.
- `emails/` — send-ready email templates.
- `pwa-icons/` — app icons and web manifest.
- `_ds/` — design system tokens, styles and compiled components.
- `support.js` — runtime the HTML files need to open in a browser. Not part of the build.
