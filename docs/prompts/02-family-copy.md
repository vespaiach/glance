# Prompt 2 — Re-copy Glance for a family audience ✅ delivered (v2)

[← All prompts](../design-prompts.md)

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
