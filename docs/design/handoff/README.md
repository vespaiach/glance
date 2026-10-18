# Handoff: Glance · responsive web app

Glance is a responsive web app; it can run on desktops, laptops, tablets, and phones. It can be used as smart wall family calendar.

## Start here
1. **`Glance.dc.html`** is the source of truth for layout, copy, states and component usage. Open it in a browser (keep `support.js` and `_ds/` next to it). It is a working prototype: navigation, sheets, settings, calendar, photos and the background picker all work.
2. **`Glance - Behavior Notes.dc.html`** covers everything the screens can't show: interactions, every state, timers, offline and keyboard behavior, and what is mocked. Items marked **Mock** need a real implementation.
3. **`Glance Frames.dc.html`** links to 10 boards (one per feature), each showing its screens at 1920×1080, 1440×900, 1280×800, 1180×820, 820×1180 and 390×844 (phone).

`archive/` holds the earlier fixed-canvas mockup and its README. They are superseded. Ignore them unless you need history.

## About the files
These are design references built in HTML, not production code. Rebuild them in the target codebase. If there is no codebase yet, React + CSS custom properties fits best: the design system's components are React and its tokens are CSS variables.

## Design system
Built only from the bound design system (`_ds/…/`, namespace `KioskDisplayDesignSystem_21b0bf`). Port these first:
- Tokens: `tokens/*.css` (colors, seasons, type, spacing, radii, shadows, motion).
- Components: Clock, EventRow, MonthGrid, Button, IconButton, PillTabs, TextInput, TopBar, ColorBlock, WeatherNow, ForecastDay, Banner, StickyNote, Eyebrow, Icon. Internals are in `_ds_bundle.js`.
- Icons: Lucide 0.460.0, stroke 1.75 (1.25–1.5 at large sizes).
- Fonts: Geist and Geist Mono (substitutes for the proprietary fonts in the source reference).

## Layout
- Not a scaled canvas. Breakpoints by window width: **wide ≥ 1200**, **mid 1000–1199**, **narrow 600–999**, **phone < 600**. Wide and mid fit one screen; narrow and phone stack into one scrolling column. Phone specifics are in the behavior notes.
- Type and gutters use `clamp()`. The exact values are the CSS variables on the app's root element in `Glance.dc.html` (`--type-*` and the gutter variable).
- Per-view grid templates are in the `layout(view, bp)` method of the logic class.
- Navigation (default): left sidebar. An 80 px icon rail (Today, Calendar, Weather, Notes, Photos; Ambient and Settings at the bottom; an X last that hides the rail to a grip). The edge grip expands it to a 320 px drawer with labelled rows and a “Close” row pinned at the bottom. Rail and drawer close only with their X; taps outside go to the page. Hidden on Sign in and Ambient. `nav=bottom` switches to the bottom bar (TopBar) with the same items as 56 px IconButtons (`size="touch"`).
- Today: tapping Picture of the day opens Photos with that photo featured and the slideshow paused. Below 1200 px the schedule's “Add event” and “Full calendar” buttons are icon-only.
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
- The current event: "Design review" is "now" by id.
- Event times are minutes of the day on a fixed Oct 2026 date, not real timestamps. Production stores moments in time and shows them in the location's time zone.
- Time zones: a small state → zone table and a fixed offset from Pacific (October values). Production needs a real place → time zone lookup.
- Use my location: no real device location; it always finds Portland, OR after 2.6 s (`geo=` forces a failure).
- The weather condition and icon ("Partly cloudy"), plus Ambient's "Light rain · Sat 80% rain".
- "Maria", "maria@example.com" (the known account), the sign-in link expiry, upload progress and place search.
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
- `Glance.dc.html` — the app. URL params open any state: `view=today|calendar|weather|notes|photos|settings|background|ambient|signin` (+ `sub=location|ambient` with `view=settings`; `amb=same|split|off`, `pick=all.s|all.e|wknd.s|wknd.e` on the Ambient screen page), `bg=photo`, `sheet=event|newevent|note|newnote`, `time=start|end|error|noend`, `clock=24`, `season=spring|summer|fall|winter`, `empty=1`, `net=loading|offline|wxerror`, `kb=1`, `signin=form|sending|sent|name|location|phone|expired|offline|done` (+ `on=link`, `acct=returning`), `upload=one|progress|error|offline`, `wx=searching|unknown|choose|locating|denied|unavailable|outside|lookup|tz|savefail`, `geo=denied|unavailable|outside|lookup|none`.
- `Glance - Behavior Notes.dc.html` — behavior and states.
- `Glance Frames.dc.html` + `Glance Frames - *.dc.html` — boards by feature.
- `_ds/` — design system tokens, styles and compiled components.
- `support.js` — runtime the HTML files need to open in a browser. Not part of the build.
- `archive/` — superseded static mockup.
