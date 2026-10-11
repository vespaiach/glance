# Claude Design prompts — Glance

Paste each prompt into Claude Design in the **Glance** project (the one that produced `Glance.dc.html` and the boards). Run them **in order**: prompt 2 changes copy that prompts 1 and 3 build on. Each prompt asks for output in the same handoff format (prototype + URL param, board frames at the six sizes, behavior notes) so it drops straight into `docs/design/handoff/`.

| # | Prompt | Status |
|---|---|---|
| 1 | Event time entry and validation | ✅ Delivered in handoff v2 → spec §8.3.1 (`TPK-*`) |
| 2 | Re-copy for a family audience | ✅ Delivered in handoff v2 → spec §10 |
| 3 | Sign-up/sign-in flow + undesigned states | ✅ Delivered in handoff v3 → spec §8.1 (`SIGNIN-*`), PHOTO-06..09, WX-07..09 |

All three prompts are delivered. Spec references: [`product-spec.md`](product-spec.md) — §8.3.1 (time entry), §10 (family copy), §8.1 / PHOTO-06..09 / WX-07..09 (sign-in, upload, location states).

---

## Prompt 1 — Event time entry and validation ✅ delivered (v2)

```
Design the time entry for the Event sheet in Glance (Glance.dc.html, sheet=event). Today the
"Starts" and "Ends" fields are free-text inputs with no AM/PM and no validation. Replace them with
a real time picker and end-after-start validation.

Context
- Glance is a family wall calendar used on touch screens (1920×1080, 1280×800), laptops,
  iPad portrait (820) and phones (390). Users stand at the screen, often kids. Touch first:
  no hover states, press = scale 0.97.
- Opening the OS keyboard covers ~36% of the screen, so the picker must work by tapping alone,
  with no typing needed. Typing can be an optional path.
- The Clock setting (12-hour / 24-hour) must drive the picker: 12-hour shows AM/PM, 24-hour does not.

Requirements
1. Starts and Ends pickers that fit the existing sheet (max-width 560, radius 32, sticky action
   row). Tap targets at least 44 px, 56 px preferred.
2. Defaults: New event starts at the next full half hour after now. Ends defaults to start + 1 hour.
   Changing Starts moves Ends with it, keeping the duration.
3. Steps of 5 minutes. Show how a user reaches a time quickly (for example hour, minute and
   AM/PM columns, or a list of common times plus "Other").
4. Validation: if Ends is not after Starts, show an inline error on Ends ("Ends before it starts")
   using the TextInput error style, and keep Save enabled but blocked, the same pattern as
   "Add a title". The error clears on the next change.
5. Optional end: an event may have no end. Show how Ends is cleared and how a row with no end reads.
6. The day stays fixed. It is shown in the sheet eyebrow ("Friday, Oct 9"). Do not add date editing.

States to show
- New event (defaults filled), Edit event, picker open on Starts, picker open on Ends,
  end-before-start error, no end time, 12-hour and 24-hour, offline ("Save for later").

Constraints
- Use only the bound design system (KioskDisplayDesignSystem_21b0bf): tokens, Button, IconButton,
  PillTabs, TextInput, Eyebrow, Icon (Lucide 0.460.0). If a new component is needed, build it from
  those tokens and name it.
- Keep the season palette working in all four seasons and on a photo background.

Deliverables
- Update Glance.dc.html so the picker works in the prototype, plus a URL param to open each state
  (e.g. sheet=event&time=start|end|error|noend).
- Add the states to "Glance Frames - Calendar.dc.html" at 1920×1080, 1440×900, 1280×800,
  1180×820, 820×1180 and 390×844.
- Update the Calendar section of "Glance - Behavior Notes.dc.html": interactions, defaults,
  validation rule and copy. Remove "time pickers" and "end-before-start validation" from the
  "Not designed" lists.

Out of scope: all-day, multi-day and recurring events, and time zones.
```

---

## Prompt 2 — Re-copy Glance for a family audience ✅ delivered (v2)

```
Glance's audience is now families: a shared wall calendar in a home (kitchen, hallway), used by
parents and kids. The current copy and mock data are written for an office lobby ("Northwind HQ ·
Lobby", rooms, front desk, clients). Re-copy the whole prototype for a family. Do not change
layouts, components or behavior.

Voice: "a calm family noticeboard." Warm but brief, sentence case, readable from 2 m, words a
child can read. No "I". "You" only in instructions. No emoji in UI chrome.

Apply these changes (already agreed; adjust wording only if you find something clearer):
- Sign-in hero: "Calendar, weather, notes and photos for the Rodriguez family. Sign in to manage them."
- Sign-in body: "Enter your email. We'll send a link that signs this screen in."
  Placeholder "name@example.com". Footer: "Only your family can see its calendar, notes and photos."
- Display label (Today hero footer, Ambient): "Rodriguez family · Kitchen".
- Calendar empty day: "Nothing scheduled. A free day."
- Event sheet: rename "Location" to "Where", placeholder "Home, school, park…".
- Rain banner body: "Grab an umbrella if you're heading out."
- Notes: "Leave a note for the family" (placeholder and empty state).
- Photos and Background: "Team photos" → "Family photos" everywhere.
- Account card: "maria@example.com · Rodriguez family".
- User-facing text says "screen", not "display".

Replace the mock data with family content, keeping the same shapes so frames stay comparable
(5 events today with the 2nd one "now", 4 events on other October days, 5 notes with the same
tones and tilts, 6 photos):
- Today: School drop-off 9:00–9:30 Lincoln Elementary · Grandma's video call 10:30–11:15
  Living room (now) · Lunch with Aunt Rosa 12:00–1:00 Café Lumen · Dentist — Leo 2:00–2:20
  Dr. Patel (Alert) · Soccer practice 3:30–4:30 Laurelhurst Park.
- Other days: Movie night (2nd), Parent-teacher conference (14th), Leo's birthday party (22nd),
  Pumpkin carving (28th).
- Notes: "Wi-Fi password is on the fridge!" (Dad) · "Package for Mia at the front door." (Mom) ·
  "Window cleaner comes Wednesday — please leave blinds up." (Mom) · "Welcome home, Grandpa!"
  (Mia) · "Bike lock code changes Friday. Ask Dad." (Dad).
- Photos: Apple picking · Pumpkin patch (Family outing) · Cannon Beach (Summer trip) ·
  First day of school · Bike ride · Forest Park trail (Weekend hike).

Review every other string in Glance.dc.html, the boards and the behavior notes for office
wording (rooms, desk, booking, team, clients, workspace) and replace it in the same voice.

Deliverables
- Updated Glance.dc.html, all "Glance Frames - *.dc.html" boards and the behavior notes.
- A short copy changelog (old → new) at the top of the behavior notes.
```

---

## Prompt 3 — Sign-up/sign-in flow and undesigned system states (upload, location) ✅ delivered (v3)

```
Redesign the sign-in flow as one sign-up/sign-in flow, and design the states Glance doesn't have
yet. Build on the current version (family copy, TimeField/TimePicker). Glance is a family wall calendar (touch screens,
laptops, iPad portrait, phones). Use only the bound design system and follow the existing
patterns: empty states have one action, failures change only their own zone, copy is calm and
brief, and kids may read it.

A. Sign up and sign in (view=signin) — one flow, passwordless email link, expires in 10 minutes
   Account model (decided): one family = one account = one email address. There are no members
   or per-person logins. Everything (events, notes, photos, settings) belongs to that account,
   and every screen signed in with that email shows the same data. Signing up and signing in
   are the same flow: an unknown email creates the account when its link is opened.

   1. Email form: one form for new and returning families. Replace "Welcome back" (it assumes
      a returning user) with a title and body that fit both, e.g. "Sign in or get started".
      Keep "Send sign-in link", the email validation and the lock footer. Change the sign-in
      hero "…for the Rodriguez family" to something that needs no family name (e.g. "…for
      your family").
   2. Sending: after "Send sign-in link" is tapped, before "Check your email".
   3. Check your email: the same screen and copy whether the email is new or known, so the
      flow never reveals whether an account exists. "This screen signs in by itself" stays.
   4. First sign-in — "What's your name?": shown only the first time an email signs in (new
      account), right after the link is opened and before Today. One field, "Your name"
      (required, error "Add your name"), primary "Continue". It appears on the device that
      opened the link. If that's a phone, the waiting screen shows "Finish on your phone" and
      then signs in by itself. Returning sign-ins skip this step. Full-page form rules apply
      (KB-03: pad by the keyboard, keep the field in view).
   5. Expired or already-used link, as seen on the device that opened the link and on the
      waiting screen. Offer "Send a new link".
   6. Offline: the form shows that a link can't be sent right now. Retry when back online.
   7. Signed in: short confirmation ("Welcome, Maria" for a new account, "Welcome back,
      Maria" for a returning one) on the waiting screen before Today opens.
   8. Settings › Account card and header: show the person's name and email only ("Signed in
      as Maria · maria@example.com"). There is no family name anymore, so remove
      "· Rodriguez family". Sign out signs out this screen only.
   9. Screen label (decided): replace "Rodriguez family · Kitchen" with just "Glance" in the
      Today hero footer and the Ambient top row (same mono eyebrow style), on every board.
   Out of scope: changing the name or email later, deleting the account, more than one email
   per account.

B. Photo upload (view=photos and the Background page's "Upload photo" tile)
   1. Uploading: progress for one and for several files. The thumbnail appears in the grid
      right away with a progress state. Uploading must not block the slideshow.
   2. Failure per file (too large — limit 20 MB; not an image; network). Retry or remove
      per file.
   3. Offline: Upload is disabled with a reason, matching the offline pill pattern.

C. Weather location (view=weather setup, "Where is this screen?")
   1. Searching: after "Show weather" is tapped.
   2. Unknown place: "We couldn't find that place" style error on the input, with an example.
   3. Several matches (e.g. "Portland"): let the user pick one (Portland, OR / Portland, ME).

Deliverables
- Working states in Glance.dc.html with URL params (e.g. signin=form|sending|sent|name|phone|expired|offline|done,
  upload=progress|error|offline, wx=searching|unknown|choose).
- Frames added to "Glance Frames - Account" (including the updated Settings account card),
  "Glance Frames - Photos" and "Glance Frames - Weather"
  at 1920×1080, 1440×900, 1280×800, 1180×820, 820×1180 and 390×844.
- Behavior notes updated for each state: trigger, copy, timers and what clears it. Rewrite the
  "Sign in and account" section for the one-account sign-up/sign-in flow, and remove these items
  from the "Not designed" lists.
- Apply the "Glance" screen label (A9) on Today, Ambient and every board that shows it.
```
