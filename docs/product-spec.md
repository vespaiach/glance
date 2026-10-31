# Glance — Product Specification

| | |
|---|---|
| Status | v1.46 |
| Date | 2026-10-31 |
| Technical design | [`tech-design.md`](tech-design.md) |
| Design | [`design/handoff/`](design/handoff/) (§2) |

This spec is an **addendum to the design handoff**. The handoff shows and describes every screen: its layout, states, words and behavior. This spec adds what the handoff can't hold: the **requirement IDs** (`TODAY-03`, `NOTE-05` …) cited in tasks, PRs and tests; the **rules the handoff leaves out** (data, sync, offline, server, accessibility, the API); and **where the app differs from the handoff**. Where a requirement states a rule, it wins over the handoff. A requirement that only names a behavior means "as the handoff shows it" in the frame given. The exact words live in `src/copy.ts`; quoted text here names a string, and `{braces}` are interpolated. Apostrophes are always typographic (’).

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
Calendar sync and subscriptions (Google/Outlook; an .ics file can be imported once, IMP-*, and upcoming events exported as one, SET-18) · more than one API key per account, read-only or scoped keys, webhooks (§8.14) · recurring events other than weekly, multi-day events · renaming or recoloring tags · note moderation · photo albums · weather alerts, forecast-day detail · places outside the US, more than one location per account, per-screen locations · guided setup, renaming screens or signing out one other screen · roles and permissions · changing the account name or email · session expiry, kiosk lock · a list of past reminders, reminders at the start, reminder dismiss, snooze, per-person reminders and per-event lead times.

---

## 2. Design sources

The handoff lives in `docs/design/handoff/`. Open its pages in a browser.

- **`app.dc.html`**, the clickable mockup, wins on layout, states and component use. Its child **`event-page.dc.html`** is the event page (New event, Edit event, Event details).
- **`app-notes.dc.html`** wins on behavior: interactions, timers, offline, keyboard, components and data. Items it marks **Mock** are built for real (below).
- **Layout pages**, one per view: `today-layout`, `calendar-layout`, `event-layout`, `weather-layout`, `note-layout`, `photo-layout`, `account-layout`, `settings-layout`, `ambient-layout` (`.dc.html`). Each shows every state at large 1920×1080, normal 1024×768 and small 390×844, and each state's label carries the IDs it shows, e.g. "Wrong code (SIGNIN-17)". The **Frame** column below names that state as *Page › state*.
- **Other pages:** `shared-components` (the component library), `notifications-widget` (NOTIF-*), `guide-layout` (GUIDE-01), `terms-layout` (TERMS-01), `emails/`, `pwa-icons/`, `backgrounds/`. Then the handoff README, then the design-system readme in `_ds/`.
- **Checking:** each feature against its layout page at the three sizes (the event page against `event-layout`).

**Where this spec overrides the handoff** (the requirement holds the rule):
- TODAY-07: on large, Today's photo frame is capped at `25dvh − 24px`.
- EVT-01, EVT-05: the event page scrolls as a whole under its sticky top bar; Back with changes asks "Discard changes?" in the top bar, and from Event details Back, Discard and Save return to details.
- NOTIF-01, NOTIF-06: one reminder per event, at the lead time only; Ambient's Next slot reads "Now · {start} – {end}" while the event runs. Reminders are built, not "planned".
- EVT-11, FAM-04: new members (tags) are added from the event page's Who picker.
- TPK-09: the event page keeps the 24-hour Clock and the offline "Save for later".
- SET-13: photo storage is 5 GB per account by default, set per server.
- SIGNIN-15, IMP-04: Sign in another device and Add from your phone codes last 3 minutes; the Import events phone code 10.
- SET-19, §8.14: the API key reads and writes events on the app's own host (owner, 2026-10-29).
- SET-18: Export events is disabled offline.
- Any row that ends "(design notes differ: …)" also overrides the handoff.

**Not built from the handoff:** its leftover code (the Family sheet, the bottom bar and `bar=`, the `evlook=` event-page looks; `barAuto` stays as SET-05's Hide sidebar when idle), its URL parameters (the app's routes are §6) and its "Not designed" list (§1.2). Everything it marks **Mock** is real: the clock ticks and statuses recompute every minute (STATUS-01), events are moments in time shown in the screen's time zone (LOC-06), places and zones come from a real lookup (LOC-04, LOC-05), and data saves to the account and syncs (SYNC-01).

---

## 3. Technical baseline

- After the first load, view changes never reload the page, and the shell's timers (clock, idle, slideshow, sync) keep running. Every view is a real route, so deep links work (§6).
- The app is an **installable PWA** that cold-starts offline (OFF-06). It needs HTTPS. On iPad kiosks, install it to the home screen so saved data isn't evicted.
- Stack, hosting, icons and fonts: [tech design](tech-design.md) §1.

---

## 4. Design system

### 4.1 Seasons
Season roles used in this spec: block-1 = Now panel, block-3 = weather, block-4 = highlight, soft = warm neutral and the notes' paper, deep = Ambient, accent = alerts. At most one accent action per screen.

### 4.2 Gallery

| ID | Requirement | Frame |
|---|---|---|
| DS-01 | Dev-only component gallery. `/dev/gallery` (dev server only) shows every component in all 4 seasons and every state the layout pages show, at the three sizes. | no UI |

### 4.3 Fluid type and gutters
Type sizes and the gutter use the prototype's fluid `clamp()` sizes; Ambient keeps its own clock and eyebrow sizes.

### 4.4 Motion and feedback
- No bounces and no blur.
- The Clock's colon blinks every 0.6 s.
- Reduced motion: screen changes, slides, the season and background cross-fades and the keyboard resize happen at once, and the Clock's colon stays on. Press, tab and tile feedback stay.

## 5. App shell and layout

### 5.1 Breakpoints (window width, live on resize)
The sidebar narrows the page but doesn't change the size class.

### 5.2 Shell

| ID | Requirement | Frame |
|---|---|---|
| SHELL-01 | Left sidebar with seven items. Landmark: a `nav` named "Main". Icons: Today `house`, Calendar `calendar-days`, Weather `cloud-sun`, Notes `sticky-note`, Photos `image`, Ambient `moon` (named "Ambient screen"), Settings `settings`. | Today › Full |
| SHELL-02 | Active view is marked; Ambient is never active. The active item carries `aria-current="page"`. | Today › Full |
| SHELL-03 | No sidebar on full-width pages. Besides Sign in and Ambient, Terms of Service and the Guide also have no sidebar. | Account › Email form; Ambient › Full |
| SHELL-04 | Changing view closes any open sheet and scrolls to the top. | no UI |
| SHELL-05 | Photo background: text zones sit on white panels. Color blocks and the sidebar stay solid (no panel, no transparency). | Today › Photo background |
| SHELL-08 | Sidebar has three states: Hidden, Rail, Expanded. | not framed yet (expected Today › Full, sidebar states) |
| SHELL-08a | Cycle Hidden → Rail → Expanded → Hidden, plus Rail → Hidden by the rail's close. | not framed yet (expected Today › Full, sidebar states) |
| SHELL-08b | Load on Today starts Hidden; other views bring the Rail back; Today leaves it as is. | not framed yet (expected Today › Full, sidebar hidden) |
| SHELL-08c | Small has no Rail: Hidden and Expanded only; any view change returns to Hidden. | not framed yet (expected Today › Small-screen drawer) |
| SHELL-08d | Sidebar state not saved. The state belongs to this browser tab only and is never persisted. | no UI |
| SHELL-08e | Hidden shows only the edge grip; views keep an inset so it covers nothing. | not framed yet (expected Today › Full, sidebar hidden) |
| SHELL-08f | Rail with fixed close footer and the Expand menu handle. | not framed yet (expected Today › Full, rail) |
| SHELL-08g | Expanded drawer pushes the page aside, no scrim; page taps don't close it. | not framed yet (expected Today › Full, drawer open) |
| SHELL-08h | Small drawer over a scrim, opened from the grip. A scrim tap closes it and moves focus to the grip. | not framed yet (expected Today › Small-screen drawer) |
| SHELL-08i | Sidebar slides. With reduced motion it changes at once. | no UI |
| SHELL-09 | Sidebar keyboard and focus. The grip and Expand menu carry `aria-expanded`. Escape in Expanded → Rail. Opening the drawer focuses the current view's row. Escape or picking a row → focus to Expand menu; Close or the rail's close → the grip; the grip → Expand menu. A view change that brings the rail back, and a page load, move no focus. Parts not shown are `inert`. No focus trap. | no UI |
| SHELL-10 | Sidebar inset pads the whole shell. The inset for the current state (grip, rail, or drawer plus margin; on small only the grip) pads the shell, so the views and the offline pill follow it. Sheet scrims and full-screen Photos cover the sidebar. | not framed yet (expected Today › Full, sidebar states) |
| SHELL-11 | Hides when idle after 15 s; paused by sheets, keyboard and focused fields. Hiding and the grip tap move no focus. | not framed yet (expected Today › Full, sidebar hidden) |

---

## 6. Routes

| Route | View |
|---|---|
| `/signin` | Sign in |
| `/` → `/today` | Today (`?event={id}` opens Event details; `?at={HH:MM}`, a reminder group's push, shows Today; NOTIF-07) |
| `/calendar` | Calendar (`?date=YYYY-MM-DD`) |
| `/weather` · `/notes` | Weather · Notes |
| `/photos` | Photos (`?photo={id}`, PHOTO-01) |
| `/settings` · `/settings/background` · `/settings/location` · `/settings/ambient` · `/settings/import` | Settings · Background · Location (SET-09) · Ambient screen (SET-10) · Import events (IMP-01) |
| `/ambient` | Ambient |
| `/terms` | Terms of Service (TERMS-01; public, no sign-in, no sidebar) |
| `/guide` | Guide (GUIDE-01; public, no sign-in, no sidebar) |
| `/dev/gallery` | Component gallery (DS-01; dev server only) |

---

## 7. Domain model

What the family's data means. Fields and schemas: `src/domain/schemas.ts` (tech design D6); tables: tech design §6.7.

**Account model:** one family = one account = one email. Sign-up and sign-in are the same email-code flow (SIGNIN-12). Events, tags, notes, photos and settings belong to the account; a display is one signed-in screen with no settings of its own. The account holder's name is set at the first sign-in (SIGNIN-06).

**Tags** are the family's people (the handoff's "members"): a name with a color that marks events; they never sign in. They work like tags: there is no list to manage, a tag exists because an event's Who picker created it (FAM-04), it can be removed from Settings (FAM-08), and tags are never renamed or recolored. A name is required, at most 32 characters and unique in the family ignoring case; the color is one of 12 fixed tag colors that never change with the season. Tags are listed oldest first. A new account gets one tag named after the account (SIGNIN-06), with the first color. An event's people are **everyone** (the flag, set when every tag is on it; a tag added later joins it), a set of tags, or **nobody**; "who" reads "Everyone", the names in tag order joined by ", ", or nothing. An event's color: one tag → that tag's color; more than one, everyone or nobody → the season soft color with person dots (no dots for everyone or nobody).

**Events** have a title, a day and a start, and either an end later the same local day (TPK-07), no end ("No end time", TPK-08) or all day (EVT-08); a place and notes; their people; a Notification, on unless turned off (NOTIF-09); and optionally a weekly repeat with skipped weeks (EVT-14). Times show in the screen's time zone (LOC-06).

**Settings** belong to the account: every screen of the family shares them. Temperatures are kept in °F; °C = round((F − 32) × 5/9). Season Auto follows the month: Mar–May Spring, Jun–Aug Summer, Sep–Nov Fall, Dec–Feb Winter.

**Defaults:** season Auto, 12-hour, °F, background Season drawing (the current season's; dim Strong, rotate Daily), idle on · 3 min, notes on · 7 days, hide sidebar when idle on, ambient Every night 6:00 PM – 7:30 AM (weekends 9:00 PM – 9:00 AM), ambient brightness Medium, notifications 15 min before, chime on. Push is on or off per device, never in settings (NOTIF-08). Photo storage: SET-13.

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
The hero, preview and form follow the design. Under the form, every form state shows the lock footer "Only your family can see its calendar, notes and photos." and the Terms line (SIGNIN-19). Sign-in happens on the screen that asked for the code (no email links), or by scanning a signed-in screen's code (SIGNIN-15, SIGNIN-20).

| ID | Requirement | Frame |
|---|---|---|
| SIGNIN-01 | One email form for new and returning families. | Account › Email form |
| SIGNIN-02 | Invalid email shows an error that clears on the next keystroke. | not framed yet |
| SIGNIN-03 | Sending locks the email; a failed send returns to the form with an error. | Account › Sending code; Account › Couldn’t send |
| SIGNIN-04 | Six-digit code field; the 6th digit submits; 10 s wait before resend or new email. | Account › Enter code; Account › Code typed; Account › Checking code |
| SIGNIN-17 | Wrong code clears the field; 5 wrong tries lock the code. | Account › Wrong code; Account › Locked |
| SIGNIN-06 | Name step for new accounts only. The server accepts at most 100 characters. Continue is disabled while saving; a failed save shows "Couldn’t save. Try again." | Account › Your name; Account › Your name · keyboard |
| SIGNIN-08 | Code expires after 10 minutes on Enter the code; send a new one or change email. | Account › Code expired |
| SIGNIN-09 | Signed in confirmation, then Today after 2.2 s. A PHOTO-03 code shows "Opening Photos…" and opens Photos; an IMP-04 code shows "Opening Import events…" and opens Import events. After the right code the next step follows the account's setup: done → this step; no name → SIGNIN-06; location step unfinished → SIGNIN-14 (also for a returning account). | Account › Signed in · new; Account › Signed in · returning |
| SIGNIN-10 | Offline: the form and the code step stay editable but nothing sends or submits. | Account › Offline |
| SIGNIN-11 | Sign out from Settings › Account (SET-08). | Settings › Full |
| SIGNIN-11a | Sign out dialog: this device, all devices, or cancel. Escape also closes it. | not framed yet |
| SIGNIN-11b | This device signs out only this screen. Changes on this screen not yet synced are discarded. | no UI |
| SIGNIN-11c | All devices ends every session, then this screen too, with a 4 s toast. The server also voids every Sign in another device code and every push subscription of the account (other devices: SIGNIN-18). | no UI |
| SIGNIN-11d | Both sign-outs land on the empty email form. | Account › Email form |
| SIGNIN-11e | Sign out offline or failing. Offline, "Sign out all devices" is disabled. A failed request keeps the dialog open with "Couldn’t sign out. Try again." under the buttons. | not framed yet |
| SIGNIN-12 | One 6-digit code signs up or in; once, 10 minutes, 5 tries; newest only. The email is HTML with a plain-text part that carries the same words and the code. | Account › Enter code |
| SIGNIN-13 | Server sign-out (an online 401), never while offline, no reason shown. | Account › Signed out |
| SIGNIN-13a | Sign in again form with banner and the last email prefilled. | Account › Signed out |
| SIGNIN-13b | Banner counts the changes waiting on this screen. | Account › Signed out · changes waiting |
| SIGNIN-13c | A different email warns that waiting changes will be removed, with a way back. | Account › Signed out · different email |
| SIGNIN-13d | Never interrupts an edit; shows after the sheet closes or at the idle timeout. | Account › Signed out · changes waiting |
| SIGNIN-13e | Clears only when a sign-in finishes; same email syncs, another removes the changes. | Account › Email form |
| SIGNIN-14 | Location step while first setup isn't finished. Also shown on the next sign-in of an account whose location step never ended; saving a place or skipping ends the first setup. After a failed save, editing the field drops the kept place. | Account › Where is this screen?; Account › Location · couldn’t save; Account › Location · keyboard |
| SIGNIN-18 | Other devices are signed out after Sign out all devices or Delete account. Applies to both actions: at its next request (sync, push or next open) each other screen, tablet and installed app lands on the empty email form, no SIGNIN-13 banner, no toast; its saved data, photo cache and waiting changes are removed, never sent. Timing as SIGNIN-13d: never interrupts an edit; during Ambient as AMB-07. | Account › Signed out |
| SIGNIN-19 | Two links, "Terms" → `/terms` (TERMS-01) and "Guide" → `/guide` (GUIDE-01), in every form state; each opens in a new tab. | Account › Email form |
| SIGNIN-15 | QR code tile in Settings › Account signs another device in. The code lasts 3 minutes, counting down from 3:00; at 0:00 a new one replaces it; a code works once and a new one voids the old. While a code is made the box is empty at 3:00; a failure reads "Couldn’t make a code. Try again." with "Try again" (`rotate-cw`) before "Done". Done or leaving Settings voids the code. Offline the buttons are disabled. A used or expired code opens the email form, never showing the account email (design notes differ: the countdown starts at 5:00). | Settings › Full |
| SIGNIN-20 | Scan code button on the email form, installed app on small and normal only. Hidden on SIGNIN-13's signed-out form. | Account › Email form (normal, small) |
| SIGNIN-21 | Camera sheets: ask, blocked, no camera. | Account › Scan · camera access; Account › Scan · camera blocked; Account › Scan · no camera |
| SIGNIN-22 | Full-screen QR scanner. | Account › Scan · scanning |
| SIGNIN-22a | Live camera with a frame; only codes inside the frame are read. | Account › Scan · scanning |
| SIGNIN-22b | Code found stops the camera and signs in as a returning account. | Account › Scan · code found |
| SIGNIN-22c | A non-Glance code shows a 3 s alert and scanning goes on. | Account › Scan · not a Glance code |
| SIGNIN-22d | A rejected code closes onto the email form with an info tile. | Account › Scan · expired code |
| SIGNIN-22e | Closing on offline or background. Any other failed check also closes the scanner onto the form. | Account › Scan · code found |

### 8.2 Today — `TODAY`

| ID | Requirement | Frame |
|---|---|---|
| TODAY-01 | Now panel stacks date and clock, weather now and the event summary, with tap cues; compact on small. | Today › Full |
| TODAY-02 | Event summary shows the running or next timed event, or the open-day lines. Also: a running event with no end shows no pill and "{location} · started {start} · {who}"; "Up next" meta ends with "· {who}"; durations follow §7.2 and a part minute counts as a whole one. | Today › Full |
| TODAY-03 | Summary, plans, strips, all-day tiles and Coming up rows open Event details; free slot → New event; +MORE → Calendar. | Today › Full |
| TODAY-04 | Schedule header counts what is left, header buttons adapt to width, shared person filter under it. | Today › Full |
| TODAY-05 | Plans and the event summary update live; the countdown updates every minute. | Today › Full |
| TODAY-06 | No events today shows a Coming up list of the next 5 plans, else the empty timeline. Also: a weekly event appears once, at its next week (EVT-14); with nothing ahead, small shows the empty today day list (CAL-10) instead of a timeline. | Today › Empty; Today › No events today |
| TODAY-07 | Today's photo sits on its own white panel on every background. | Today › Full |
| TODAY-07a | Photo header with Add photo and All photos; icon buttons under 440 px. | Today › Full |
| TODAY-07b | A 4:3 frame cropped around the focal point, capped in height on large only and uncapped on normal and small (design notes differ: they cap it on normal at 50% of the viewport height minus 64 px). | Today › Full |
| TODAY-07c | Title falls back to place, then date; camera file names never show. | Today › Full; Today › Photo · long title |
| TODAY-07d | Caption is On this day with the year, else date and place. | Today › Full; Today › Photo · long title |
| TODAY-07e | Frame, title and caption are one button → Photos on that photo, paused. | Today › Full |
| TODAY-07f | A more-photos row with thumbnails opens Photos when there are other photos. | Today › Full |
| TODAY-07g | Add photo opens the in-panel phone code on large, the file picker elsewhere. | Today › Photo · add from phone |
| TODAY-07h | Loading shows a pulsing frame. | Today › Loading |
| TODAY-07i | First upload shows the dimmed preview, progress bar and upload status. | Today › Photo · first upload |
| TODAY-07j | Didn't-load state, with an offline variant when no copy is saved. | Today › Photo · didn’t load |
| TODAY-07k | No photos shows the memory tile, which does what Add photo does. Also: the three moments are consecutive entries from a fixed list ("Sunday pancakes", "the first snow", "a birthday cake", "pizza night", "the first day of school", "a day at the beach", "camping by the lake"), starting at the day of the year, first letter capitalized. | Today › Empty |
| TODAY-07l | One photo per day, the same on every screen, changing at local midnight with the cross-fade. | no UI |
| TODAY-07m | On this day photos first, else the shuffled cycle. Also: with several On this day matches, the oldest year wins; an On this day day doesn't use up a cycle turn. | no UI |
| TODAY-07n | Only finished uploads count and the background photo is skipped. Also: an upload never changes the day's photo unless the day had none. | no UI |
| TODAY-07o | Deleting today's photo moves to the next one at once. | no UI |
| TODAY-07.1 | Example: Today Oct 9, 2026; photos taken Oct 9, 2024 and Oct 9, 2025 → the 2024 photo, caption "On this day · 2024". *(tested)* | no UI |
| TODAY-07.2 | Example: three photos, no On this day match → each shows once, shuffled, before any repeats. *(tested)* | no UI |
| TODAY-07.3 | Example: the cycle pick is the current background photo → the next photo in the cycle shows. *(tested)* | no UI |
| TODAY-07.4 | Example: A photo uploaded today when today already has one → today's photo stays; the new one joins the end of the cycle. *(tested)* | no UI |
| TODAY-08 | Weather now in the Now panel opens Weather. Also: a saved forecast after a failed fetch shows "{city} · Updated {time}" (FAIL-02). No location → "Set weather location" / "The forecast and the clock follow it." → Weather setup. Failure → "Weather unavailable" / "Trying again in {n} min." with no button; only the Weather view has "Try again" (design notes differ: Today › Weather with no location says "Weather needs a location" / "Set the city once…", and Loading › Source failure gives the Today weather zone a "Try again" button). | Today › Full |
| TODAY-09 | Notes box with header, up to two notes, a more row and empty and loading states. Also: an unsigned note's button is named "Note: {text}". | Today › Full |
| TODAY-10 | On a photo background every zone sits on its white panel. | Today › Photo background |
| TODAY-11 | Schedule is today's day timeline with the earlier fold; small shows the day list. Also: Today's timeline shows no rain chips. On normal the timeline starts at 536 px and grows up to 3× (design notes differ: Today › Schedule says min 560 px in one place, 536 px in another). | Today › Full |
| TODAY-12 | All-day tiles above the timeline; never in the event summary, never struck through. | Today › All-day events |
| TODAY-13 | Open day shows the day ribbon with now marker, sunset tick and ended-event bars. Also: the sunset icon moves below the bar when it overlaps the "Now {time}" label, taking the label's span as 42% of the ribbon (placed by its alignment) plus 4% on each side. | Today › Empty; Today › No events today |
| TODAY-14 | Three, two or one column layout with sticky Now panel and gutters on all sides. Windows under 320 px scroll sideways on small (design notes differ: Today › Schedule card size says 340 px; Now panel sizes says 320 px). Body type scales by min(width ÷ 1920, height ÷ 1080), clamped to 1×–1.5×. | Today › Full; Today › Loading |

### 8.3 Calendar & events — `CAL`, `EVT`

| ID | Requirement | Frame |
|---|---|---|
| CAL-01 | Week strip: range eyebrow, month, chevrons, 7 self-measuring day cells with count or dots and forecast. | Calendar › Full; Calendar › Loading |
| CAL-02 | Chevrons step a week; Today button returns to today; small header card with date-picker button and week row. | Calendar › Full |
| CAL-03 | Small date picker modal: month paging this year to next, pick or Today closes, scrim or Close keeps the day. | Calendar › Date picker |
| CAL-04 | Timeline fits the panel; with 24 hours on it gets a taller minimum and the page scrolls. Also: `/calendar?date=` opens Calendar with that day selected. | Calendar › Full; Calendar › Loading |
| CAL-05 | Person filter stack and Show plans for list. Also: an everyone plan shows while any tag is selected. Week counts, like the dots, always count everyone. Closing the list returns focus to the stack. One filter is shared by Today and Calendar and belongs to this tab (not synced). | Calendar › Full; Calendar › Person filter · two people; Calendar › Person filter · sheet |
| CAL-06 | 24 hours link toggles 5 AM–9 PM and the full day, counts plans outside the window, stays on across days. | Calendar › 24 hours |
| CAL-07 | Add event at the end of the week strip opens New event on the selected day for the people shown. Also: with nobody shown, the new event starts with nobody. | Calendar › Full |
| CAL-08 | Empty day shows one 16 h free slot; an empty calendar shows the empty tile instead of the timeline. | Calendar › Empty |
| CAL-09 | All-day tiles sit above the timeline, filtered by the person filter. | Calendar › All-day events |
| CAL-10 | Small day list: plans in start order, today's earlier/now/later groups, free tiles, empty and nobody lines. | Calendar › Full (small); Calendar › Many plans · column cap (small) |
| EVT-01 | One full-screen event page for New, Edit and details, sliding in and out from the right. The page scrolls as a whole; cards have no inner scroll; the top bar stays pinned (design notes differ: the page never scrolls and only the picker card and day preview scroll inside). | Event › New event; Event › Update event; Event › Keyboard open |
| EVT-02 | Sentence card with tappable words and the link row. Also: each word is named "{field}: {value}. Change" ("{field}: not set. Change" for a placeholder), with field names "What’s happening", "Day", "Starts", "Ends", "Who it’s for", "Where", "Notes". Who reads "everyone", "{a}", "{a} and {b}", "{a}, {b} and {c}" or "{a}, {b} and {n} others" in tag order, "no one" for nobody. | Event › New event; Event › Update event; Event › Keyboard open |
| EVT-03 | Defaults show as placeholders until touched; Save needs a title. Also: Who defaults to the people shown in the filter it was added from, not always everyone. The title is trimmed before the check, and there is no "Add a title" error. | Event › New event |
| EVT-04 | Time entry follows §8.3.1. | no UI |
| EVT-05 | Sticky top bar with Back, title and actions; compact icon-only bar on small. There is no Close (×): Back is the only way out. With changes Back asks "Discard changes?"; from Event details, unchanged Back and Discard return to details; Escape is Back; offline Save reads "Save for later" (design notes differ: a × always closes at once and drops changes, including from details). | Event › New event; Event › Update event |
| EVT-06 | Delete asks inline with Keep and Delete event; a weekly event uses the series dialog. | Event › Update event |
| EVT-07 | Save closes the page or returns to details; the timeline, week dots and Today update at once. | no UI |
| EVT-08 | All day chip disables the time grids, skips Ends and rewrites the sentence. Also: the event fills its date; turning it off restores the draft's start and end; Ambient shows "All day" for it. | Event › All day |
| EVT-09 | Event details: status title, read-only sentence, notes and flags, forecast and overlapping plans; ended events locked. Also: values are named "{field}: {value}. Edit"; Back closes the page; an all-day event on an earlier day counts as ended; status lengths format as §7.2. | Event › Event details |
| EVT-10 | Edit from details swaps to Edit event in place; Back, Discard and Save return to details; Delete closes the page (design notes differ: × closes the page at once and drops unsaved changes). | Event › Event details |
| EVT-11 | Who picker: Everyone plus a chip per tag, multi-select; unpicking the last tag selects Everyone. Below the chips an "Add a person" field (at most 32 characters) suggests tags not yet on the event whose name fuzzy-matches, best first: starts with → a word starts with → contains → letters in order → one typo away (3+ characters), ignoring case, accents, spaces and hyphens. A tap, or Enter on an exact name (any case), adds that tag and clears the field; a name matching no tag shows the NEW MEMBER tile (FAM-04). Saving with every tag stores everyone; a nobody event opens with no chip picked (design notes differ: the Who picker only picks existing members and adding a member has no entry point). | not framed yet |
| EVT-12 | Picker card: header with Next, field order, and the title, day, how often, who, where and notes pickers. Also: a title has no line breaks; the Day grid's month arrows go from this month on; day cells are named "{Wkd}, {Month} {d}" plus ", today" (and ", repeats"); choosing a How often tab sets the Day word and counts as a change; notes are saved trimmed. Recent titles and places are the account's distinct values (trimmed, ignoring case), most recently changed first, at most 6 titles and 5 places. | Event › New event |
| EVT-13 | Large day preview column, normal Same time line, neither on small. Also: the preview is named "{Fri, Oct 9} · {start} – {end}" ("· All day", or the start alone with no end). Its weather tile shows the start hour's temperature and condition, "· {n}% rain" at 30% or more, an hourly strip of up to 6 hours for events over an hour, the day high for all day, and is hidden without a location. An overlapping plan gets an accent dot when it shares a person with this event. A chosen time with no end counts as 30 minutes, another plan with no end as its start minute. Same time ignores all-day plans; names read "Everyone", "{a}", "{a} and {b}" or "{a}, {b} and {n} others", with "is" for one person or Everyone. | Event › New event |
| EVT-14 | Weekly repeat and the this-event-or-series dialog. Also: a weekly event happens every later week on the same weekday at the same local time and length, with no end date and never before its first day, except dates in `exdates`, which have no occurrence and no reminder. Every week shows wherever a day's or week's events show (Today, Now panel, timeline, day list, week dots, date picker, Ambient, Coming up) and reminds on its own. Tapping a week opens details on that week, titled by it, or by the current or next week once it has passed, so a series never reads "Ended"; a reminder or push link opens the current or next week. Escape cancels the dialog; with no title the body reads "This event". Series save keeps the first day; a moved day shifts the first day and skipped weeks by as many days. *(tested)* | Event › Update event |

#### 8.3.1 Time entry — `TPK`

| ID | Requirement | Frame |
|---|---|---|
| TPK-01 | Starts/Ends header with the length on Ends and the 12-hour AM/PM toggle. | Event › Starts picker; Event › Ends picker |
| TPK-02 | No typing: each tap changes one part and keeps the others. | Event › Starts picker |
| TPK-03 | Hour and Minutes grids in 5-minute steps; selected black; disabled cells take no tap. | Event › Starts picker |
| TPK-04 | Ends adds a Length row and No end time. Also: lengths count from the start and are capped at 11:55 PM. | Event › Ends picker |
| TPK-05 | Start at the next whole hour, end one hour later. Also: the start is capped at 11:00 PM and the end at 11:55 PM. | Event › New event |
| TPK-05.1 | Example: Now 10:41 AM → 11:00 AM – 12:00 PM. *(tested)* | no UI |
| TPK-05.2 | Example: Now 10:10 PM → 11:00–11:55 PM. *(tested)* | no UI |
| TPK-05.3 | Example: Now 11:45 PM → 11:00–11:55 PM. *(tested)* | no UI |
| TPK-06 | Changing the start keeps the length, end capped at 11:55 PM. Also: an event with no end keeps none; with an end, a start later than 11:50 PM moves to 11:50 PM. | no UI |
| TPK-06.1 | Example: 11:00 AM – 12:00 PM, start moved to 2:00 PM → 2:00–3:00 PM. *(tested)* | no UI |
| TPK-06.2 | Example: 11:00 AM – 1:00 PM, start moved to 11:00 PM → 11:00–11:55 PM. *(tested)* | no UI |
| TPK-06.3 | Example: 11:00 AM – 12:00 PM, start moved to 11:55 PM → 11:50–11:55 PM. *(tested)* | no UI |
| TPK-06.4 | Example: 11:00 AM with no end, start moved to 2:00 PM → 2:00 PM, no end. *(tested)* | no UI |
| TPK-07 | Ends is at least 5 minutes after Starts; earlier cells are disabled, with no error. Also: the end stays on the same day; an hour cell is disabled when its :55 is before start + 5 min; a pick that would land earlier moves to start + 5 min. | Event › Ends picker; Event › Ends before it starts |
| TPK-07.1 | Example: Start 11:00 AM, end picked 10:30 AM → the end moves to 11:05 AM. *(tested)* | no UI |
| TPK-07.2 | Example: Start 11:00 AM → end hour 10 disabled, 11 enabled. *(tested)* | no UI |
| TPK-07.3 | Example: Start 11:30 AM → end cell 11:30 disabled, 11:35 enabled. *(tested)* | no UI |
| TPK-08 | No end time clears the end; Add end time brings it back. Also: Add end time caps the end at 11:55 PM; for layout a plan with no end runs to the end of its day. | Event › No end |
| TPK-09 | The Clock setting drives the sentence, picker and plan cards: on the 24-hour clock the Hour row reads 00 … 23 and the AM/PM toggle is hidden. Offline the page works the same and Save reads "Save for later" (design notes differ: the picker is 12-hour only and has no offline label yet). | Event › Starts picker · 24-hour clock |
| TPK-10 | Grid cells use `aria-pressed`. Hours are named "3 PM" (or "15 hundred"); minutes "{nn} minutes". | Event › Starts picker |

#### 8.3.2 Day timeline — `TL`
Pure layout rules live in `src/domain` (tech design).

| ID | Requirement | Frame |
|---|---|---|
| TL-01 | 5 AM–9 PM span fits the card; gutter labels thin out; Calendar rows have a minimum height. | Calendar › Full |
| TL-02 | Elastic hours weighted by short-plan coverage; passed hours shrink on today. | Calendar › Full |
| TL-02.1 | Example: A day other than today, no plans 6–7 PM → that hour weighs 1. *(tested)* | no UI |
| TL-02.2 | Example: Another day, one plan 9:00–10:30 AM → 9 AM weighs 4, 10 AM weighs 1 + 3 × 0.5 = 2.5. *(tested)* | no UI |
| TL-02.3 | Example: A 7:00–11:00 AM plan (4 hours) alone in 7–8 AM → 7 AM weighs 1. *(tested)* | no UI |
| TL-02.4 | Example: Today at 10:41 AM, 7–8 AM fully covered by short plans → 4 × 0.35 = 1.4 on Calendar, 4 × 0.3 = 1.2 on Today; an empty 5–6 AM → 0.35 on Calendar. *(tested)* | no UI |
| TL-03 | Overlapping plans share columns, longest left, widening into free columns; plans have a minimum height. | Calendar › Full; Calendar › Many plans · column cap |
| TL-03.1 | Example: 9:00–10:00, 9:00–9:30 and 9:30–10:00 → the hour-long plan in the left half, the two half-hour plans in the right half. *(tested)* | no UI |
| TL-03.2 | Example: 9:00–10:00, two 9:00–9:30 plans and 9:30–10:00 → three columns; the 9:30 plan widens over the two columns the 9:00–9:30 plans free (from 1/3, 2/3 wide). *(tested)* | no UI |
| TL-03.3 | Example: A 3:00–3:15 PM plan in a short hour → still the minimum height. *(tested)* | no UI |
| TL-03.4 | Example: A plan that overlaps nothing → the full width. *(tested)* | no UI |
| TL-04 | Plan card content follows its real size. Also: the card is a button named "{title}, {range}"; a plan that started before 5 AM shows "Until {end}" as its time. | Calendar › Full |
| TL-05 | Cards take the event's color; past and now have their own look; other days are never now. | Calendar › Full |
| TL-06 | 24 hours: full day, empty night hours weigh half, busy night hours are elastic. | Calendar › 24 hours |
| TL-07 | Hour weather under gutter labels and rain chips on cards. Also: Today shows hour weather only where it says something new: the first hour, an icon change, rain starting or stopping (50% or more), else every 3 hours. Rain chips skip past plans and one-line cards. | Calendar › Full |
| TL-08 | Dashed free slots for 30 min+ gaps; tap opens New event in the slot. Also: a slot is named "Free {range}. Add event"; long-plan strips count as busy; on today a slot starts at now; a slot shorter than 44 px isn't drawn. | Calendar › Full; Calendar › Empty |
| TL-08.1 | Example: Another day with plans 4:30–5:15 AM, 7:00–11:00 AM, 9:00–10:30 AM, 11:00 AM–12:00 PM and 2:00–4:00 PM → free slots 5:15–7:00 AM, 12:00–2:00 PM and 4:00–9:00 PM. *(tested)* | no UI |
| TL-08.2 | Example: Today at 10:41 AM, no plans → one slot 10:41 AM – 9:00 PM; tap → New event 10:45–11:45 AM. *(tested)* | no UI |
| TL-08.3 | Example: A free 8:30–9:00 PM slot → New event 8:30–9:00 PM (ends at the slot's end). *(tested)* | no UI |
| TL-08.4 | Example: Today at 8:40 PM, free since 4:00 PM → 20 minutes left, under 30 → no slot. *(tested)* | no UI |
| TL-09 | Now marker on today: a line behind the cards with a time pill in the gutter, moving every minute. | Calendar › Full |
| TL-10 | Tapping a plan opens Event details; day or filter changes reflow. Also: with reduced motion the reflow is instant. | no UI |
| TL-12 | Column cap: columns that don't fit fold into a +N MORE tile; tap goes to Calendar or the earliest folded plan. | Calendar › Many plans · column cap |
| TL-12.1 | Example: Calendar, 600 px wide, four overlapping plans 9:00–10:00, 9:00–10:00, 9:10–10:00 and 9:05–10:00 → two columns stay and "+2 MORE" spans 9:05–10:00 on the right; tap → Event details of the 9:05 plan. *(tested)* | no UI |
| TL-12.2 | Example: Same card, four plans 6:00–6:15 PM → a 48 px "+2" tile showing the count alone. *(tested)* | no UI |
| TL-12.3 | Example: Calendar, 1000 px wide, four overlapping plans → four 250 px columns, nothing folds. *(tested)* | no UI |
| TL-12.4 | Example: Today, 400 px wide, four overlapping plans → only 3 columns of 120 px fit, so two stay beside the 52 px tile, "+2 MORE"; tap → Calendar on today. *(not tested)* | no UI |
| TL-13 | Plans over 3 hours become edge strips beside the gutter; tap opens Event details. | Calendar › Full |

#### 8.3.3 Tags — `FAM`

| ID | Requirement | Frame |
|---|---|---|
| FAM-07 | Tags are the family's people; no manage sheet, no rename or recolor; removal only from Settings. | no UI |
| FAM-04 | New tag from the Who picker: when the typed name matches no tag exactly (any case), a NEW MEMBER tile shows between the field and the suggestions with a preview pill, "Add member" and the 12 color swatches (first unused color preselected; any color once all are taken). "Add member" or Enter creates the tag and puts it on this event. Offline it syncs later (SYNC-02); if another screen added the same name first, this tag becomes that one on sync and its events keep the person (design notes differ: adding a member has no entry point). | not framed yet |
| FAM-05 | A new tag goes last in the filter and week dots, is selected when the filter shows everyone, and joins every everyone plan. | no UI |
| FAM-08 | Remove a member from Settings with two taps; only-that-member plans are deleted, shared ones drop them. Also: singular forms "1 member", "1 plan", "Their 1 plan is deleted.", and "They’re taken off {n} plans shared with others." ("1 plan"). Plan counts include past live events; everyone events are not counted and don't change. Asking on another row cancels the first. It works offline and syncs later (SYNC-02); the server also refuses removing the last tag. A removed name can be added again as a new tag (FAM-04). | Settings › Remove a member |

### 8.4 Weather — `WX`

| ID | Requirement | Frame |
|---|---|---|
| WX-01 | Read-only view: now with four details, next 8 hours, 7-day forecast. Also: the eyebrow is "{city}, {state code} · Now" with "H {h}° · L {l}° · Feels like {f}°" under the condition; a day's rain % shows only from 10%. | Weather › Full |
| WX-02 | Values follow the unit setting with no unit letter. Also: with °C, wind is in km/h. | Weather › Full |
| WX-03 | Forecast banners. Rain banner (cloud-rain) "Rain moving in after {time}" / "Grab an umbrella if you're heading out." when any of the next 8 hours is ≥ 50%, at the first such hour. The stale banner "Forecast from {time}" / "Updates when the screen is back online. Conditions may have changed." shows only when offline and the forecast is over an hour old. | Weather › Full |
| WX-04 | Setup card with city or ZIP field and Use my location, shared with Settings and sign-in. | Weather › Empty · setup card; Weather › Finding your location; Weather › Location blocked |
| WX-05 | Loading skeleton and the Weather unavailable failure with retry countdown and Try again. | Weather › Loading; Weather › Weather unavailable |
| WX-06 | Refresh interval. The forecast refreshes every 15 min. | no UI |
| WX-07 | Searching replaces the buttons; typing cancels. Also: a failed search shows "Place search isn’t responding. Try again in a moment.", keeps the text and clears on the next keystroke. | Weather › Searching |
| WX-08 | Unknown place shows an error on the input. | Weather › Unknown place |
| WX-09 | Several matches list one row each with time zone; a tap sets it, a single match is set at once. Also: the query is a city, "City, ST" or ZIP; at most 5 matches, largest first. | Weather › Several matches |
| WX-10 | Open-Meteo attribution link under the 7-day forecast whenever forecast data shows. | Weather › Full |

### 8.5 Notes — `NOTE`

| ID | Requirement | Frame |
|---|---|---|
| NOTE-01 | Add note → New note; a note → Note details. Also: an unsigned board note is named "Note, {time}: {text}". | Notes › Full; Notes › Loading |
| NOTE-02 | New and Edit note sheet is the paper, with a growing message field and a free-text From field. | Notes › New note; Notes › Edit note |
| NOTE-03 | Empty message shows an error; a blank name posts unsigned. | not framed yet |
| NOTE-04 | Newest first with tilts and time stamps. Also: "Just now" lasts 5 min; the short weekday and time is used within 6 days, then "{Mon} {d}". | Notes › Full |
| NOTE-05 | Footer has no Cancel, a Post/Save button and the 120-character hint. | Notes › New note; Notes › Edit note |
| NOTE-06 | Count eyebrow reflects the note count and the expiry setting. | Notes › Full |
| NOTE-07 | Empty board shows the dashed box with the note pad that opens New note. | Notes › Empty |
| NOTE-08 | Notes expire after the Settings value. Also: a note expires `noteExpiry.days` × 24 h after it was created (while expiry is on); the server deletes it and every screen hides it, offline too. | no UI |
| NOTE-09 | Anyone can edit or delete any note. Also: the board scrolls. | Notes › Full |
| NOTE-10 | Read-only Note details with Delete and Edit, switching in place to Edit note. Also: unsigned, the dialog is named "Note"; the eyebrow shows "Waiting to post" until the note is sent. | Notes › Note details |

### 8.6 Photos — `PHOTO`

| ID | Requirement | Frame |
|---|---|---|
| PHOTO-01 | A thumb features its photo; chevrons wrap. Deep link: `/photos?photo={id}` features that photo with the slideshow paused until someone steps, picks or plays; an unknown id opens Photos as usual. | Photos › Full; Photos › Loading |
| PHOTO-02 | Slideshow advances every 8 s while open; Pause/Play toggles; chevrons and thumbs keep it playing. | Photos › Full |
| PHOTO-03 | Upload opens the Add from phone panel (large, normal) or the file picker (small). The panel's QR code is a one-time sign-in link for this account with SIGNIN-15's rules (works once, for 3 minutes, replaced at 0:00 while shown); it opens Photos on the phone, where Upload opens its file picker. Panel body: "Point your phone’s camera at the code and pick photos. They show here as they finish uploading." | Photos › Upload · from phone |
| PHOTO-04 | Size (20 MB max) and type are checked before upload. Upload progress is the real transfer progress, not simulated. | Photos › Uploading |
| PHOTO-05 | Empty state with a QR card (large, normal) or Upload photos (small, offline). Body: "Upload family photos to show them here, as Today’s photo and as a background." | Photos › Empty |
| PHOTO-06 | Each upload shows as a faded tile with progress; a row above sums them; a tile turns normal at 100%. | Photos › Uploading; Photos › First upload |
| PHOTO-07 | Uploads never block the slideshow, which uses finished photos only. | Photos › First upload |
| PHOTO-08 | Per-file failure tiles with reason pill, Try again / Remove, and a summary row. Storage limit: a photo that would pass the account's storage limit (SET-13) fails with the pill "Storage full" (named "Storage full · delete photos to make room") and Remove only; the row reads "Storage full" with "Clear". | Photos › Upload failed |
| PHOTO-09 | Offline disables upload and pauses uploads until reconnect. A paused upload whose send failed restarts from 0% on reconnect. Paused uploads are lost on reload. | Photos › Upload offline |
| PHOTO-10 | Name, date and place are read from the file on upload. Rules the notes lack: name cleanup also removes the words at, am, pm, copy, edited, final; an all-lowercase name gets a capital; blank or camera-placeholder titles ("OLYMPUS DIGITAL CAMERA", "Default", "Image") don't count as a title. Date falls back last to the upload day. Place "City, ST" is US only, else empty. Extra hint "Name guessed from where it was taken."; hints show until saved in Photo details. | Photos › Photo details · from file name; Photos › Photo details · from metadata |
| PHOTO-10.1 | Example: "halloween-costumes-2025-10-31.jpg", no metadata → name "Halloween costumes", date Oct 31, 2025. *(tested)* | Photos › Photo details · from file name |
| PHOTO-10.2 | Example: "IMG_2041 Mia birthday.jpg" → name "Mia birthday". *(tested)* | no UI |
| PHOTO-10.3 | Example: "IMG_4410.jpg", no title or date in the file, GPS in Portland, OR, modified Sep 6, 2026 → name "Portland", date Sep 6, 2026, place "Portland, OR". *(tested)* | Photos › Photo details · from metadata |
| PHOTO-10.4 | Example: title "OLYMPUS DIGITAL CAMERA" on "P1010001.JPG", no GPS, no modified date → name "P1010001", date the upload day, no place. *(not tested; the placeholder rule and the file-name fallback are)* | no UI |
| PHOTO-11 | Featured photo shows name, date and place (year only outside the current year), with the featured actions row. | Photos › Full |
| PHOTO-12 | Photo details sheet edits name, date and place, each with a source caption. Rules the notes lack: a seventh caption "File name"; a field typed back to its original value is not "Edited"; a future date shows "No future dates"; clearing the date saves "No date"; Save syncs; offline the button reads "Save for later". (design notes differ: any change to a field turns its caption into "Edited") | Photos › Photo details · from file name; Photos › Photo details · from metadata |
| PHOTO-13 | Delete confirms in place, then removes the photo. Rules the notes lack: it leaves every list on every screen, its files are deleted on the server, and a deleted background photo turns the background back to the Season drawing. | Photos › Delete photo |
| PHOTO-14 | Full screen viewer with counter, controls, tap to hide rows, keyboard and close rules. It is a `dialog` named "{name} · full screen". | Photos › Full screen; Photos › Full screen · controls hidden |
| PHOTO-15 | Set as background makes the featured photo the fixed Photo-mode background and pauses the slideshow. It replaces any mode (Season drawing, Blank or Slideshow) and keeps the dim setting. | Photos › Photo details · from file name |
| PHOTO-16 | Portrait photos crop in thumbs and backgrounds and show whole when featured or full screen. Today's photo also crops them. | Photos › Full |

### 8.7 Settings & Background — `SET`, `BG`

Sub-pages (Location, Background, Ambient screen) keep Settings active in the sidebar.

| ID | Requirement | Frame |
|---|---|---|
| SET-01 | Settings header with the signed-in name and email. Eyebrow "Screen settings", title "Settings". | Settings › Full; Settings › Empty; Settings › Loading |
| SET-02 | Season radios (Auto + four seasons) with a follows/fixed subtitle. Auto re-checks the season at midnight. | Settings › Full |
| SET-03 | Background row opens the Background page. Body "Season drawing, photo, slideshow or blank"; summary "Season drawing · {Season}" / "Photo · {title}" / "Slideshow · {interval}" / "Blank". | Settings › Full |
| SET-04 | Clock radios: 12-hour or 24-hour, applied to every time on screen. | Settings › Full |
| SET-05 | Temperature radios, then Notifications, then the Hide sidebar when idle switch. Temperature subtitle: "Weather is shown without a unit letter". | Settings › Full |
| SET-06 | Ambient screen tile shows the schedule hours and opens the Ambient screen page. A set with equal dim and wake times reads "Not set" in the tile. | Settings › Full |
| SET-07 | Back to Today after and Remove notes after: switch plus slider; off means never and keeps the last value. | Settings › Full |
| SET-08 | Account card order: identity, Photo storage, screens list, Sign in another device, Sign out, Delete account. | Settings › Full; Settings › Empty |
| SET-09 | Location row and Location page. Rules the notes lack: the button reads "Set location" when unset and the setup card's primary is "Search"; right block rows Weather ("The forecast on Today, Weather and the ambient screen") and Time zone ("{zone} for the clock, Today, the calendar and event times"); unset caption "Until a location is set, times follow this device’s own clock."; footer "Shared by every screen on this account". A different zone asks first (LOC-09). | Settings › Location |
| SET-10 | Ambient screen page: schedule modes, brightness, dim/wake fields with picker, 24-hour bars and Preview. Rules the notes lack: a dim time before noon belongs to the night before; each time field is a button named "{label}, {time}. Change"; a "Not set" set never runs; Off shows the right block "No ambient hours." / "Touch-to-wake and the idle timer work as usual." | Settings › Ambient screen |
| SET-12 | Read-only list of signed-in screens with type icon, name and last-active caption. Rules the notes lack: type from the signing-in browser (iPhone or Android phone → smartphone, iPad or Android tablet → tablet, else monitor); name "{browser} {screen \| tablet \| phone}" for Chrome, Edge, Firefox, Safari, else "Screen", "Tablet", "Phone"; caption formats "Active {n} min ago" / "{n} hr ago" / "yesterday" / "{Mon} {d}"; read from the server when Settings opens; offline or on failure only this screen shows. | Settings › Full |
| SET-13 | Photo storage meter with left/used, almost-full and full states. Rules the notes lack: the limit is set by the server (5 GB by default), read when Settings opens; offline or on failure the tile is hidden; an upload that would pass the limit fails as "Storage full" (PHOTO-08). | Settings › Full; Settings › Photo storage · almost full; Settings › Photo storage · full |
| SET-14 | Delete account confirm dialog with live counts, checkbox gate, deleting lock and toast. Rules the notes lack: Escape cancels (unless deleting); the server also erases photo files, screens and push subscriptions (SIGNIN-18); a failure ends the deleting state with the Banner "Couldn’t delete the account" · "Nothing was erased. Try again." and "Try again"; offline the row's button is disabled. | Settings › Delete account |
| SET-15 | Guide and Terms card with two rows that open the Guide and Terms in a new tab. Rules the notes lack: the rows link to `/guide` (GUIDE-01) and `/terms` (TERMS-01); on small it comes before the Schedule card; the card is a navigation landmark named "Guide and terms". | Settings › Full |
| SET-16 | Remove a member card sits between Schedule and Account; Data and app comes last. | Settings › Full; Settings › Remove a member |
| SET-17 | Left card row order, ending with Import, Export and API key. The Import row's "Last: {date}" summary is not shown offline. | Settings › Full |
| SET-18 | Export events downloads upcoming events as `glance-events.ics`. Rules the notes lack: offline the button is disabled with "Offline · needs a connection"; singular "1 upcoming event" / "Saved 1 event · …"; only live events, a weekly series counts once; no end time → no `DTEND`; DESCRIPTION ends "For: {names}" or "For: Everyone"; text escaped (`\\`, `\;`, `\,`, line breaks as `\n`); one `EXDATE` per skipped week. | Settings › Full |
| SET-19 | API key row: one read-and-write key per account. Body "Lets other apps read, add and update events · one key per account"; endpoint "GET · POST · PATCH · DELETE {host}/api/v1/events" on the app's own host (§8.14); created-panel body "Anyone with it can see, add and change events on this calendar."; used formats "Never used" / "Used {n} min ago" / "Used {n} hr ago" / "Used yesterday" / "Used {Mon} {d}"; a revoked key's calls get 401. (design notes differ: keys only add and update events with no read access, endpoint "POST · PATCH api.glance.app/v1/events") | Settings › Full |
| SET-20 | Refresh data row: sync now with refreshing, success, failure and offline status. Refresh also sends waiting changes first; before the first sync there is no "Updated" status ("Offline" alone when offline). | Settings › Full; Settings › Refreshing data |
| SET-21 | Reload app row with version status, inline confirm and full-screen cover. Rules the notes lack: the version is `package.json`'s `version`, bumped every release; the server version is read when Settings opens and at the hourly update check; Reload now applies a waiting update, else reloads bypassing the cache; changes waiting to sync also stay; unlike OFF-07 it doesn't wait for idle. | Settings › Full; Settings › Reload app |
| BG-01 | Background page with back link and four modes. | Settings › Background · season; Settings › Background · photo |
| BG-02 | Season drawing thumbs and family photo grid with Upload photo tile. Labels: "Season drawings · select one"; each drawing named "Use {Season} drawing as background"; photo label "Family photos · select one" / "Family photos · all {n} in rotation". | Settings › Background · season |
| BG-03 | Tapping a drawing switches to Season; a family photo switches Season or Blank to Photo. In Slideshow a tapped photo keeps the mode Slideshow. | Settings › Background · photo |
| BG-04 | Preview, dim (Off, Light, Strong) and Change photo interval (Slideshow only). | Settings › Background · season; Settings › Background · photo |
| BG-05 | Missing from notes: a caption per mode. Season (none picked) "The {season} drawing is the background. It changes with the season until you pick one; panels stay solid on top."; Season (picked) "The {season} drawing is the background on every screen. Panels stay solid on top."; Blank "Screens use a plain light gray background. Pick a photo to switch."; Photo "{title} is the background on every screen. Panels stay solid on top."; Slideshow "Showing {title}. The photo changes {interval}; panels stay solid on top." | Settings › Background · season; Settings › Background · photo |
| BG-06 | How each mode renders. Rules the notes lack: the photo dim is two stacked black layers, each at the dim value, cross-fading (§4.4); Slideshow goes in upload order, the next photo at each local hour, midnight or Sunday midnight; a tapped thumb shows now and the rotation continues from it; mode or interval changes keep the current photo; Photo mode with none picked shows the oldest upload. | Settings › Background · season |

### 8.8 Ambient — `AMB`

| ID | Requirement | Frame |
|---|---|---|
| AMB-01 | Top row: place (or season) on the left, at most one status on the right; signed out wins over offline. | Ambient › Full; Ambient › Empty |
| AMB-02 | Giant clock at Ambient's own size. | Ambient › Full; Ambient › Empty; Ambient › Loading |
| AMB-03 | Weather and Next event rows. Weather: "{temp}° · {condition}", then the low line; its rain part names the first of the next 6 days at 50% or more ("Tomorrow" or "{Wkd}"), and with none it shows the low alone. No location → no weather block. An all-day next event reads "All day" and comes first. | Ambient › Full |
| AMB-04 | Wake hint fades 10 s after start; a tap goes to Today or the signed-out form. The whole screen is one button named "Wake screen". | Ambient › Full; Ambient › Empty |
| AMB-05 | Enters at dim time, leaves at wake time. It leaves at wake time only if Ambient is showing; never runs when a set is "Not set". A screen that starts during ambient hours reaches Ambient the same way as after a wake tap (after the idle timeout). | no UI |
| AMB-06 | Background and brightness colors. The night drawing gets no dim. Browsers can't dim the backlight, so today the text color is the whole effect. | Ambient › Full; Ambient › Photo background |
| AMB-07 | Signed out during Ambient: it stays with the signed-out status and hint. The end of ambient hours also opens the signed-out form, not only the next tap. | Ambient › Signed out |
| AMB-08 | The sidebar's Ambient item and Settings Preview open Ambient at once, outside the schedule. | no UI |
| AMB-10 | Enter and leave transitions; taps ignored during them; reduced motion switches at once. | no UI |
| AMB-11 | Burn-in drift: the rows move together every 2 min; reduced motion jumps. | Ambient › Full |

### 8.9 Sheets — `SHEET`

Escape closes an unchanged sheet like scrim, Cancel or ✕. While "Discard changes?" shows, "Keep editing" has focus and Escape discards. Focus is trapped in the sheet; opening focuses the sheet itself so no keyboard pops up, and closing returns focus to the opener (design notes differ: the note composer's textarea autofocuses). Offline banner texts, title "You're offline": note sheets "The note saves on this screen and posts when the connection is back."; Photo details "Changes save on this screen and sync when the connection is back."

### 8.10 Event notifications — `NOTIF`

| ID | Requirement | Frame |
|---|---|---|
| NOTIF-01 | A timed event with its Notification on fires once, at the account's lead time (15 or 30 min) before its start. There is no reminder at the start. With the lead time Off nothing fires; all-day events never fire. A weekly event fires once for each week, never before its first day or in a skipped week, and its Notification applies to every week (design notes differ: the strip gets a bell-ring "Now · {start} – {end}" variant at the start, push has "{event} starting now", and the design page frames "Calendar · at start"). | Notifications › Today · 15 min before; Notifications › Calendar · at start |
| NOTIF-02 | Missed and changed reminders. Changing an event's Notification, or the account's lead time, also cancels and reschedules pending reminders. | no UI |
| NOTIF-03 | The strip has one form only, "In {n} min · {start} · {who} · {place}", with empty parts left out; {n} is the lead time or the real time left. With reduced motion it appears and closes at once (design notes differ: they add a "Now · {start} – {end} · {place}" eyebrow and a bell-ring icon at the start). | Notifications › Compact strip |
| NOTIF-04 | Reminders due in the same minute merge into one strip; See all goes to Today at that time. | Notifications › Weather · 3 events at once |
| NOTIF-05 | Strip never steals focus, closes anything or resets idle; a new one replaces it; chime rules. | no UI |
| NOTIF-06 | Reminder on Ambient. An event with no end stays in the slot until its day ends. Only events whose reminder actually fires take the slot: not with the lead time Off or the event's Notification off. | Notifications › Ambient · quiet hours |
| NOTIF-07 | Push only while Glance is closed or in the background. Title "{event} in {n} min", group "{count} events in {n} min"; group body "{start} · {titles}". Each reminder is pushed once (design notes differ: they also have a "{event} starting now" push). | Notifications › Phone or tablet |
| NOTIF-08 | Settings › Notifications, Chime and This phone. Chime sub-line "Plays once when a reminder shows. Never during quiet hours." This phone shows "Get reminders when Glance is closed.". When the browser blocks it, "Notifications are off for Glance in this browser’s settings." replaces the button. The setting is per device and never synced. | Settings › Full; Notifications › Settings · Notifications |
| NOTIF-09 | Per-event Notification on/off on the event page. Changing it counts as a change for "Discard changes?". | Event › New event; Notifications › Event page Reminder field |
| NOTIF-10 | Not included: no list of past notifications, no reminder at the start, and no dismiss, snooze, per-person reminders or per-event lead times (design notes differ: they have an at-start reminder, and their data model lists reminder "off \| at start \| 15 min \| both"). | no UI |

### 8.11 Terms of Service — `TERMS`

| ID | Requirement | Frame |
|---|---|---|
| TERMS-01 | `/terms` page, the same for everyone: the handoff's terms (effective October 31, 2026: a demo, used at your own risk, contact support@takeaglance.app), words from `copy.ts`. Added to the handoff's text: "How your data is stored" adds three points. Content you enter is never sold or shared, except with the hosting provider or when the law requires it. Google Analytics gets usage data only, never that content. Error reports (the error, the page and the app version, never what you enter) go to the Glance server, which keeps them in its logs. The Termination section's list of sections that survive matches the final numbering. The header links "Source on GitHub" to `https://github.com/vespaiach/glance`. One readable column at all sizes. | Terms of service |

### 8.12 Guide — `GUIDE`

| ID | Requirement | Frame |
|---|---|---|
| GUIDE-01 | `/guide` page, the same for everyone, words from `copy.ts`, with changes from the page. 09 Reminders' first line reads "Choose when reminders come in Settings › Notifications: 15 or 30 minutes before, or off.". Questions adds "Can I add a school or team calendar?" after "How do I change or delete an event?", answered "Yes, once. Go to Settings › Import events and choose its .ics file, or send it from your phone. The events become normal Glance events; later changes to the file don’t sync. Undo removes them for 24 hours.". The 08 intro reads "Import, Export and API key need a connection.". Its API key text reads "API key lets another app read, add and update events on your calendar. Tap Create key and copy it right away; it’s shown only once. One key per account. Revoke it to stop the app, then create a new one if needed.". Colors follow the season by the UTC date (Auto), and 07's Season card shows Auto selected. Text uses the app's type scale, not the page's larger sizes. Each question is a button with `aria-expanded`, and the first one starts open. | Guide |

### 8.13 Import events — `IMP`

| ID | Requirement | Frame |
|---|---|---|
| IMP-01 | Settings row opens the Import events page. Any signed-in screen of the account can import. | Settings › Full |
| IMP-02 | Full-screen page with a sticky top bar; it scrolls to the top on open, close and every step change. | Settings › Import · source |
| IMP-03 | Step 1, Source. Back is named "Back to settings". The last-import tile's Undo shows only while undo is still open (IMP-10). If the upload can't reach the server, Source stays as it was. | Settings › Import · source |
| IMP-04 | Step 2, Send from phone. The code is a one-time sign-in link (SIGNIN-15 rules, but it lasts 10 minutes) that opens Import events on the phone, where Choose file uploads the file for this screen. When the file arrives this screen moves to Review, and the phone shows the same Review and can import from there too. A file this screen chose itself doesn't count as arriving. "New code" and 0:00 replace the code and restart at 10:00; leaving the step voids the code. | Settings › Import · send from phone |
| IMP-05 | Reading the file, on the server for both paths. VEVENTs are read with their time zones. SUMMARY, LOCATION and DESCRIPTION become title, place and notes, cut to 140, 60 and 280 characters; an empty title reads "Untitled event". Each event keeps its `ATTENDEE` display names (`CN`): trimmed, cut to 140 characters, distinct ignoring case, at most 20. Attendees with no name are skipped, and `ORGANIZER` isn't an attendee. Each repeat and changed week keeps the names from its own VEVENT. Names are only matched to people (IMP-08), never shown. Timed events keep their moment and show in the location's zone; a time with no zone is read in the location's zone. A plain weekly repeat with no end (`FREQ=WEEKLY`, no `UNTIL`/`COUNT`, at most its own weekday) becomes a weekly series. Its `EXDATE`s become skipped weeks, and each `RECURRENCE-ID` becomes a skipped week plus a one-time event. Every other repeat becomes one-time events for the next 12 months, without its `EXDATE`s and with its changed weeks. A multi-day all-day event becomes one all-day event per day. A timed event that runs past midnight ends at midnight of its start day. Events that ended before now are left out; one still running is kept. | no UI |
| IMP-06 | Limits and errors. A file over 5 MB, not a calendar, or with over 1,000 events after IMP-05 shows the type error, body "Choose a file that ends in .ics. Export one from the calendar app’s settings.". With nothing left after IMP-05: body "Every event in it has already happened, so there’s nothing to add.". Both errors return to Source. | Settings › Import · wrong file type; Settings › Import · no events in file |
| IMP-07 | Step 3, Review. Who defaults to Everyone. Under the chips: "{m} matched to people in the file; the rest are for your pick." ("1 matched…"; left out when none match). Singular form "1 is already…", and with no duplicates only "Past events aren’t imported.". Events are listed in date order, all day reads "All day", and a series shows its first week and "Every week". A duplicate has the same title (ignoring case), start and end as an event already on the calendar, a week of a series, or an earlier event in the file. Singular button "Import 1 event". Matched = new (not duplicate) events whose attendees name a current member. | Settings › Import · review |
| IMP-08 | Importing. A new event whose attendees name members gets those members: same name ignoring case and outer spaces, as in FAM-04, and all members means Everyone. Every other new event gets the chosen who. A name that matches no member never adds one. Every new event gets Notification on. A failed request shows the same "Couldn’t import" error as offline, body "The screen is offline. Nothing was added. Try again when it’s back online.". The import adds all or nothing. | Settings › Import · importing |
| IMP-09 | Step 4, Imported. ✕ is named "Close" and goes to Settings. Singular forms "1 event added" and "1 duplicate skipped."; the duplicates sentence is left out when there are none. Then "{m} matched to people in the file." (left out when none match). Open calendar closes the page and goes to Calendar. | Settings › Import · imported |
| IMP-10 | Last import and Undo. The account keeps only its latest import (date, count, who); a new import replaces it. Undo, for 24 hours on Imported and on Source, deletes every event that still came from that import, edited or not; events already deleted stay deleted. After Undo there's no last import until the next one. Offline, Undo is hidden. | Settings › Import · imported |

### 8.14 Public events API — `API`

Other apps read and write the family's events with the account's API key (SET-19). The API lives on the app's own host under `/api/v1/events`, speaks JSON, and needs no cookies. Events it writes are normal events: they sync and show on every screen and remind like any other (NOTIF-01).

| ID | Requirement |
|---|---|
| API-01 | **Key:** every call sends `Authorization: Bearer glc_live_…`. A missing, unknown or revoked key → 401 and nothing is read or changed. Each accepted call sets the key's last use (SET-19). A call only ever sees the key's own account; another account's event id answers 404. |
| API-02 | **Rate limit:** 60 requests a minute per key; the 61st within the minute → 429 with `Retry-After` (seconds until the minute ends). |
| API-03 | **Event JSON** (answers): `id`, `title`, `start`, `end` (absent = no end time), `allDay` (true or absent), `who` (member names in tag order; absent = everyone; `[]` = no one), `place`, `notes`, `repeat` (`"weekly"` or absent) and `exdates` (local `YYYY-MM-DD` dates a series skips). Timed `start`/`end` are ISO 8601 in UTC; an all-day `start` is its local date `YYYY-MM-DD`. A weekly series is one item, as stored, never expanded. The `id` is the event's handle for the other calls. |
| API-04 | **List:** `GET /api/v1/events?from=YYYY-MM-DD&to=YYYY-MM-DD` → 200 `{ "events": [...] }`, live events only, sorted by start. `from` and `to` are optional local dates in the account's time zone (the location's, else the account's own, LOC-07), both inclusive: an event is listed when it overlaps them; a series when its first day is on or before `to` (it has no end). A malformed date or `from` after `to` → 400. |
| API-05 | **Read one:** `GET /api/v1/events/{id}` → 200 with the event; a deleted or unknown id → 404. |
| API-06 | **Create:** `POST /api/v1/events` → 201 with the new event (its `id` included). Body: `title` (required), `start` (required; ISO 8601 with an offset or `Z`, or `YYYY-MM-DD` with `allDay: true`), `end`, `allDay`, `who`, `place`, `notes`, `repeat`, `exdates`. Limits as the event page: title 1–140 characters with no line breaks, place up to 60, notes up to 280 (trimmed); `end` after `start` on the same local day (TPK-07), none for all-day. `who` is a list of member names matched ignoring case; missing = everyone, `[]` = no one, an unknown name → 400 (members are never created through the API). Reminders are on (NOTIF-09). `null` reads as absent. An invalid body → 400 `{ "error": "invalid", "field": "{name}" }`; nothing is saved. |
| API-07 | **Change:** `PATCH /api/v1/events/{id}` with any of the create fields → 200 with the event; fields left out keep their values, `null` clears an optional one (`end`, `allDay`, `who` back to everyone, `place`, `notes`, `repeat`, `exdates`), and the result is checked as API-06. On a series it changes the whole series. Unknown id → 404. |
| API-08 | **Delete:** `DELETE /api/v1/events/{id}` → 204; the event is removed from every screen as a delete from the event page is (a series goes whole). Unknown or already deleted → 404. |
| API-09 | **Browsers:** a web page on any other site can call the API from the browser (CORS): every `/api/v1` answer, the preflight included, allows any origin, the methods above and the `Authorization` and `Content-Type` headers, and exposes `Retry-After`. No cookies are sent or needed. |

---

## 9. Cross-cutting behavior

### 9.1 Time — `TIME`

| ID | Requirement | Frame |
|---|---|---|
| TIME-02 | Clock ticks each second, statuses each minute; Season Auto re-checks at midnight. | no UI |
| TIME-03 | One injectable `now` source for all time-driven logic. | no UI |

### 9.2 Idle — `IDLE`

| ID | Requirement | Frame |
|---|---|---|
| IDLE-01 | Back to Today after the idle timeout. Full-screen Photos also closes. A tap, a key press or a scroll counts as a touch. | no UI |
| IDLE-02 | Idle pauses while a text field has focus. Leaving the field restarts the wait. | no UI |
| IDLE-03 | During ambient hours, idle returns to Ambient. | no UI |

### 9.3 Loading — `LOAD`

| ID | Requirement | Frame |
|---|---|---|
| LOAD-01 | Each source loads on its own; clock and season never wait. | no UI |
| LOAD-02 | Shape-keeping pulsing skeletons, only when nothing is saved yet. | Today › Loading; Weather › Loading |
| LOAD-03 | Over 10 s means a failure. The 10 s count from screen open, but for weather from its fetch. Before the first sync, weather shows loading rather than asking for a location. | Weather › Weather unavailable |

### 9.4 Failure (online) — `FAIL`

| ID | Requirement | Frame |
|---|---|---|
| FAIL-01 | Only the failing zone changes. Body "The Glance server isn’t responding. Trying again in {n} min." (weather: WX-05). On a calendar failure the Now panel shows only the clock and weather. On Ambient, failed zones stay blank. | Weather › Weather unavailable |
| FAIL-02 | With saved data, keep showing it marked "Updated {time}". | not framed yet |
| FAIL-03 | Auto-retry after 1, 2 and 5 min, then every 5 min. | no UI |
| FAIL-04 | Crash screen. A crash outside a zone (a view, Ambient, Sign in, the Guide or the Terms) shows the whole screen as "Something went wrong", "Glance will reload in {n} s." counting down from 60, and a "Reload" button; at 0 it reloads. The third crash within 10 minutes stops the countdown: "Glance keeps running into this problem. Tap Reload to try again.", and only Reload reloads. A crash inside a zone shows only that zone's failure. Every crash is reported to the Glance server with nothing the family entered. A report carries the error, page, app version, time, screen time zone, browser, device, and the IP address with its last part removed. | not framed yet |
| FAIL-05 | Daily reload. A screen open 24 hours or more reloads at its next idle move (IDLE-01, IDLE-03, or Ambient starting or ending), into the view it was moving to, keeping waiting changes. With "Back to Today after" off and no ambient hours, it never reloads on its own. | no UI |

### 9.5 Offline — `OFF`

| ID | Requirement | Frame |
|---|---|---|
| OFF-01 | Offline pill after 30 s offline, with the saved time except on small and Weather. | not framed yet |
| OFF-02 | Saved data stays and statuses keep updating offline. | no UI |
| OFF-03 | Weather over an hour old shows the Forecast from banner. | Weather › Full |
| OFF-04 | Edits queue locally: offline banner, Save for later, notes Waiting to post. | not framed yet |
| OFF-05 | Ambient shows the offline notice in its top row. | not framed yet |
| OFF-06 | Cold start offline. A signed-in screen opens from saved data with every view working, including photos it never showed before. | no UI |
| OFF-07 | App updates apply only while idle (Ambient, or Today after the timeout) with nothing waiting to sync; the screen reloads once. If the server rejects this version, the update still applies at the next idle and waiting changes are kept. | no UI |

### 9.6 Keyboard — `KB`

| ID | Requirement | Frame |
|---|---|---|
| KB-01 | OS keyboard, sized from `visualViewport`. | no UI |
| KB-02 | Sheets shrink above the keyboard and scroll inside with sticky actions. On the event page, the page pads by the keyboard while a field has focus and scrolls; the top bar stays pinned and the focused field stays below it (design notes differ: the event form card shrinks and scrolls inside). | Event › Keyboard open |
| KB-03 | Full-page forms pad by the keyboard and keep the focused field visible. The Location card counts as a full-page form. The check runs on focus, again 350 ms later, and on every keyboard resize. The label is included when both fit and it sits at most 48 px above the field. A field already inside the visible area doesn't move. | Account › Your name · keyboard; Account › Location · keyboard |
| KB-04 | Return moves to the next field; in Message it adds a line. In the last field, Return submits a full-page form, or hides the keyboard in a sheet. | no UI |

### 9.7 Sync — `SYNC`

| ID | Requirement | Frame |
|---|---|---|
| SYNC-01 | Account data syncs to every screen. The Calendar filter, 24 hours and the selected day belong to the tab, not the account. | no UI |
| SYNC-02 | Writes go to IndexedDB with an outbox entry. The engine pushes them in order and pulls changes since its cursor. An SSE ping triggers a pull, otherwise it polls every 30 s. A pull never overwrites a row that has a pending write (tech design §5). | no UI |
| SYNC-03 | The last write to reach the server wins, and offline edits replay in order. A delete wins over a concurrent edit. Settings are one record, so the later change replaces the whole set. | no UI |

### 9.8 Accessibility — `A11Y`

| ID | Requirement | Frame |
|---|---|---|
| A11Y-01 | Every control has a name. Meaningful text-less icons are named images (hourly and 7-day icons by condition); decorative icons are hidden. | no UI |
| A11Y-02 | Choices expose their state. `aria-pressed` on swatches, PillTabs, week and date picker days, tag pills (filter) and suggestions, picker cells, thumbs and active IconButtons. Days are named by the full date, with today `aria-current="date"`. Radios use `aria-checked` and switches `role="switch"`. | no UI |
| A11Y-03 | Targets are at least 44 px. Sheets are `role="dialog"` with `aria-modal`, named by their title. | no UI |
| A11Y-04 | Sheet focus follows the visual order, ✕ → fields → swatches → actions, and wraps. | no UI |
| A11Y-05 | Hierarchy by weight, never opacity. Every pair meets WCAG AA 4.5:1: black on season blocks, soft surfaces and panels; white on deep and on Winter's accent; black on the Spring, Summer and Fall accents; white over the Ambient photo at dim 0.6 or more. | no UI |

### 9.9 Location and time zone — `LOC`

| ID | Requirement | Frame |
|---|---|---|
| LOC-01 | Use my location shows only when the browser can locate and permission isn't blocked. On a secure page only. | Weather › Empty · setup card |
| LOC-02 | Locating state and timing: permission prompt untimed, 10 s position, 5 s lookup; typing cancels. | Weather › Finding your location |
| LOC-03 | Locate failures return to the card with the draft kept, as a soft row that clears on typing. | Weather › Location blocked |
| LOC-04 | The server turns the position, rounded to 2 decimals, into a city or named area, a state and a time zone. No US state means outside the US. | no UI |
| LOC-05 | Every saved place carries its IANA zone. Search results without a valid zone are left out. | no UI |
| LOC-06 | Every time and date uses the location's zone, else the device's. A DST-skipped time moves forward by the gap; a repeated time is the first one. | no UI |
| LOC-07 | Server rules that need a local day, such as a photo's upload-day date, use the location's zone, else `accounts.time_zone`. | no UI |
| LOC-08 | Zones are named "{Name} time" from a fixed US list, with no abbreviations. A zone outside the list, such as a device zone, uses the browser's long generic name, e.g. "Central European time". | Settings › Location; Weather › Several matches |
| LOC-09 | Confirm only when the zone name changes in Settings › Location. Singular "1 hour". With no next timed event, the example line is left out. | not framed yet (Settings › Location, wx=tz) |

