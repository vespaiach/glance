# Prompt 4 — Session no longer valid (SIGNIN-13) ✅ delivered (v4)

[← All prompts](../product-spec.md) (the "Design requests" row)

```
Design one new state for Glance's sign-in flow: the screen was signed in, and the server stopped
accepting its session. Build on the current version (v3: one-account sign-up/sign-in flow,
family copy, "Glance" screen label). Glance is a family wall calendar (touch screens, laptops,
iPad portrait, phones). Use only the bound design system and follow the existing patterns:
copy is calm and brief, kids may read it, one primary action, no blame and no jargon
("session", "token", "401" never appear).

When it happens
- The screen is online and its sign-in is no longer valid (for example, the family's account
  was reset on the server). It is rare: sign-ins don't expire in v1, and "Sign out" on another
  screen signs out only that screen. It never happens while offline. An offline screen keeps
  working from saved data.
- The screen may have changes that haven't synced yet (events or notes saved while offline,
  shown as "Waiting to post"). They are kept on this screen. If the same email signs in again,
  they are sent. If a different email signs in, they are removed from this screen.

What to design (view=signin)
1. Signed-out notice on the email form (SIGNIN-01). The form looks like the normal email form
   (same hero, lock footer, no nav bar), plus a calm notice explaining that the screen was
   signed out and needs to sign in again, e.g. a soft banner "This screen was signed out" ·
   "Sign in again to keep the calendar, notes and photos up to date." Propose the final copy.
2. Email prefilled with the account's last email, still editable. "Send sign-in link" and the
   rest of the flow (Sending → Check your email → Signed in) are unchanged.
3. Unsynced changes: when there are any, say so in the notice, e.g. "{n} changes on this screen
   are waiting to sync. They'll be sent once you sign in." Use one wording for 1 and for n.
4. Different email: if the person edits the email to a different address while there are
   unsynced changes, warn before sending, e.g. "Changes waiting on this screen will be removed
   because they belong to {previous email}." Decide whether this is inline text under the field
   or a confirm step, and the exact actions.
5. Timing: the screen must not interrupt someone mid-edit. Show how it behaves if an event or
   note sheet is open or a field is focused when this happens. The proposed default is to wait
   until the sheet closes or the screen goes idle, then show the form. Also cover what a screen
   in Ambient (quiet hours) shows: the form, or Ambient until the next wake tap.
6. Signed in again: the normal "Welcome back, {first name}" confirmation (SIGNIN-09). If changes
   were waiting, they then sync as usual. No extra screen is needed unless you think one helps.
Out of scope: why the session ended (no reason is shown), session expiry rules, multiple
accounts on one screen.

Deliverables
- Working states in Glance.dc.html with URL params, e.g. signin=ended (no pending changes),
  signin=ended&pending=3 (changes waiting), signin=ended&pending=3&switch=1 (different email
  entered).
- Frames added to "Glance Frames - Account" at 1920×1080, 1440×900, 1280×800, 1180×820,
  820×1180 and 390×844.
- Behavior notes: a "Signed out by the server" item in "Sign in and account" with the trigger,
  copy, the timing rule from 5, what happens to unsynced changes, and what clears the notice.
```
