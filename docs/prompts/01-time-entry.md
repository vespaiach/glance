# Prompt 1 — Event time entry and validation ✅ delivered (v2)

[← All prompts](../design-prompts.md)

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
