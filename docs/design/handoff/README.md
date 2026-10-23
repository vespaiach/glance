# Handoff: Glance · responsive web app

Glance is a responsive web app; it can run on desktops, laptops, tablets, and phones. It can be used as smart wall family calendar.

## Start here
1. **`Glance.dc.html`** is the clickable mockup and the source of truth for layout, copy, states and component usage. Open it in a browser (keep `support.js`, `_ds/` and `emails/` next to it). Navigation, sheets, settings, calendar, photos and the background picker all work.
2. **`Glance States.dc.html`** shows every state and variant the mockup can't reach by tapping, grouped by feature, at 1920×1080, 1440×900, 1280×800, 1180×820, 820×1180 and 390×844 (size picker at the top). Also the sign-in email and the component library.
3. **`Glance Notes.dc.html`** covers app logic and behavior: interactions, timers, offline and keyboard behavior, components, data needed, mock data to replace and URL parameters. Items marked **Mock** need a real implementation.

## About the files
These are design references built in HTML, not production code. Rebuild them in the target codebase. If there is no codebase yet, React + CSS custom properties fits best: the design system's components are React and its tokens are CSS variables.

## Design system
Built only from the bound design system (`_ds/…/`, namespace `KioskDisplayDesignSystem_21b0bf`). Port these first:
- Tokens: `tokens/*.css` (colors, seasons, type, spacing, radii, shadows, motion).
- Components: Clock, Button, IconButton, PillTabs, TextInput, TopBar, ColorBlock, WeatherNow, ForecastDay, Banner, StickyNote, Eyebrow, Icon. Internals are in `_ds_bundle.js`.
- Icons: Lucide 0.460.0, stroke 1.75 (1.25–1.5 at large sizes).
- Fonts: Geist and Geist Mono (substitutes for the proprietary fonts in the source reference).

## Layout
- Not a scaled canvas. One breakpoint at 820 px window width (`Component.SMALL_MAX`), two layouts: **large** (> 820 px) fits one screen; **small** (≤ 820 px, the phone layout) stacks into one scrolling column. Small-screen specifics are in the behavior notes.
- Type and gutters use `clamp()`. The exact values are the CSS variables on the app's root element in `Glance.dc.html` (`--type-*` and the gutter variable).
- Per-view grid templates are in the `layout(view, SM)` and `fitLayout(view, SM)` methods (`SM` = small) of the logic class.
- Navigation (default): left sidebar. An 80 px icon rail (Today, Calendar, Weather, Notes, Photos; Ambient and Settings at the bottom; an X last that hides the rail to a grip). The edge grip expands it to a 320 px drawer with labelled rows and a “Close” row pinned at the bottom. Rail and drawer close only with their X; taps outside go to the page. On small screens (≤ 820) there is no rail: the edge grip opens the full drawer over a scrim, and closing returns to the grip. Hidden on Sign in and Ambient. `nav=bottom` switches to the bottom bar (TopBar) with the same items as 56 px IconButtons (`size="touch"`).
- Today: Now panel layout. Grid templates are in `todayLay(SM)`. Large: three columns, the Now panel (clock, weather now, current or next event with a countdown) at full height, the schedule in the middle, notes over Today’s photo on the right. Small: one scrolling column (Now panel, schedule, notes, Today’s photo). No separate weather card. Today’s photo (was “Picture of the day”) keeps a fixed 4:3 frame and the notes panel takes the rest of the column; tapping it opens Photos with that photo featured and the slideshow paused. Its pick, states and the large-screen “Add from your phone” panel are in the `potdV` / `potdShow` / `potdAct` values in `renderVals()`. Below 1440 px the schedule's “Add event” and “Full calendar” buttons are icon-only. The schedule is the same elastic day timeline as Calendar, for everyone. With nothing running or coming up today, the Now panel shows the open-day state: “The day is wide open” (or “That’s a wrap for today”), a 6 AM – 10 PM day ribbon with a clock marker at now and a sunset tick, and a “Next on the calendar” tile that opens Calendar.
- Calendar: week strip, person filter and an elastic 5 AM–9 PM day timeline with a weather lane (chosen option 1c). The timeline is built in the `tlBuild` function in `renderVals()`; event colors come from the people in `Component.PEOPLE`. EventRow and MonthGrid are no longer used.
- Photo background: every zone with text sits on a white panel (radius 24). Color blocks and the bar stay solid.

## Data needed
- **Events:** id, start timestamp, end timestamp (optional: “No end time”), title, where (place), color tone (1–4, soft, or accent for alerts).
- **Weather:** current (temp, condition, high, low, feels like, wind, humidity, UV, sunset), 8 hourly points, 7 days (high, low, condition, precip %).
- **Notes:** id, text, author, created time, tone, rotation.
- **Photos:** id, title, date, place, image.
- **Location** (one per account): place name, state, coordinates and its time zone. Sets the weather and every displayed time. Unset = device clock.
- **Settings** (persisted): season (Auto or a fixed season), clock 12/24 h, °F/°C, background `{mode, photoId, dim, rotate}`, idle timeout, note expiry, ambient schedule `{mode: same|split|off, all: {start, end}, wknd: {start, end}}` (minutes of the day; `wknd` = Fri & Sat nights when split; end earlier than start = next morning; start ≠ end). Default every night 6:00 PM – 7:30 AM; weekend default 9:00 PM – 9:00 AM.
- **Account:** one family = one account = one email. Stores the person's name and email. Screen label is "Glance".

## Mock data to replace
Mock data is in the `<script data-dc-script>` block at the end of `Glance.dc.html`. These values are hardcoded in it:
- The date and time (Fri Oct 9 2026, 10:41 AM; Ambient 7:12 PM).
- The family: 9 starter members with fixed colors (`Component.PEOPLE`, copied into `state.people`; added and removed in the Family sheet), and events with `who` and `bring`.
- Hourly forecast for today and tomorrow (`Component.HOURLY`) and daily highs (`Component.DAILY`).
- Event times are minutes of the day on a fixed Oct 2026 date, not real timestamps. Production stores moments in time and shows them in the location's time zone.
- Time zones: a small state → zone table and a fixed offset from Pacific (October values). Production needs a real place → time zone lookup.
- Use my location: no real device location; it always finds Portland, OR after 2.6 s (`geo=` forces a failure).
- The weather condition and icon ("Partly cloudy"), plus Ambient's "Light rain · Sat 80% rain".
- "Maria", "maria@example.com" (the known account), the sign-in code check (000000 is wrong, any other code is right) and expiry, upload progress and place search.
- Photos come from picsum.photos (seeded). Uploads are local to the tab, progress is simulated.

## Not designed
These are listed in the behavior notes:
- Calendar-source sync (Google/Outlook).
- Recurring, all-day and multi-day events.
- Note moderation and character limit, and board overflow.
- Photo delete and albums.
- Phone upload.
- Changing name or email, deleting the account.
- Weather alert trigger rules and forecast detail.
- Places outside the US, a time zone picker separate from the place, several locations per account, per-screen locations.
- Guided setup, multi-screen management and roles.
- Session expiry and app lock.
- Burn-in protection.
- Different ambient hours per weekday beyond Sun – Thu / Fri & Sat, and holiday exceptions.

## Files
- `Glance.dc.html` — the clickable mockup. URL parameters that open any state are listed in the notes (URL parameters).
- `Glance States.dc.html` — states and variants by feature. Frame letters are stable references; gaps mark removed duplicates.
- `Glance Notes.dc.html` — logic, behavior, components, data and mock notes.
- `emails/` — send-ready email templates.
- `_ds/` — design system tokens, styles and compiled components.
- `support.js` — runtime the HTML files need to open in a browser. Not part of the build.
