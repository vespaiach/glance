# Prompt 5 — Location and time zone (LOC, SET-09, SIGNIN-14) ⏳ requested

[← All prompts](../design-prompts.md)

```
Design location setup and the time zone for Glance: a "Use my location" option, a Location
row in Settings, and a location step in first-run sign-in. Build on the current version (v3
sign-in flow, family copy, the WX-04 "Where is this screen?" setup card with "City or ZIP code",
WX-07..09 searching/no-match/choose states). Glance is a family wall calendar (touch screens,
laptops, iPad portrait, phones). Use only the bound design system and follow the existing
patterns: one primary action, failures change only their own zone, copy is calm and brief, kids
may read it, no jargon ("geolocation", "IANA", "UTC" never appear).

Why: the location sets the weather AND the screen's time zone. The clock, Today, the calendar
and event times follow the location's time zone even if the device's own clock is set to the
wrong zone (for example a wall screen left on UTC). US only, as today.

A. "Use my location" in the setup card (Weather empty state, WX-04)
   1. Add a secondary action "Use my location" next to or under the City or ZIP field. Show it
      only when the device can locate itself; otherwise the card is as today.
   2. Locating: after the tap, while the browser asks permission and the place is looked up
      (can take up to ~10 s). Field stays editable; typing cancels locating.
   3. Found: the place is saved at once and the forecast loads (same as a single search match).
   4. Failures, each back on the card with the draft kept and an inline message:
      permission denied ("Location is off for this screen. Type a city or ZIP instead."),
      position unavailable / timed out, outside the US, lookup failed. Propose final copy.

B. Settings › Location (new row, SET-09)
   1. A row in the Settings panel with Season, Background, Clock, Temperature: label "Location",
      summary "Portland, OR · Pacific time" or "Not set". Decide its position.
   2. Tapping opens a Location page (like Background: back button, white panel) with the current
      place and time zone, the same setup card (search + Use my location), and the
      searching / choose / failure states. Picking a place saves at once and returns to Settings.
   3. Show what changes when the time zone changes (the clock jumps). Is a short confirmation
      needed when the new place is in a different time zone? Propose one or argue against it.
   4. How the time zone is named for families: "Pacific time", "Central time", "Hawaii time"…

C. First-run sign-in step (after "What's your name?", SIGNIN-06; new accounts only)
   1. "Where is this screen?" step with the same field, Use my location and the states from A.
      Same hero, full-page form and keyboard rules (KB-03) as the name step.
   2. "Skip for now" (secondary). Skipping goes to the Signed in confirmation; Weather then
      shows the usual setup card.
   3. Saving fails: "Couldn't save. Try again." on the step.
   4. On a phone that opened the link, this step runs on the phone (its location is usually home).

D. Today: the "Set location" prompt (TODAY-08) now leads to Settings › Location or stays on
   Weather — decide which.
Out of scope: places outside the US, a time zone picker separate from the place, several
locations per account, per-screen locations.

Deliverables
- Working states in Glance.dc.html with URL params: wx=locating, wx=denied, wx=outside,
  view=settings&sub=location, view=settings&sub=location&wx=choose, signin=location,
  signin=location&wx=locating.
- Frames added to "Glance Frames - Weather", "Glance Frames - Settings" and
  "Glance Frames - Account" at 1920×1080, 1440×900, 1280×800, 1180×820, 820×1180 and 390×844,
  in all four seasons for at least the setup card and the Location page.
- Behavior notes: a "Location and time zone" item with triggers, copy, the timing rule for
  locating, failure handling, and how the time zone shown is named.
```
