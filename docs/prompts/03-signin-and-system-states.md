# Prompt 3 — Sign-up/sign-in flow and undesigned system states (upload, location) ✅ delivered (v3)

[← All prompts](../design-prompts.md)

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
