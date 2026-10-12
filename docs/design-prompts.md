# Claude Design prompts — Glance

Paste each prompt into Claude Design in the **Glance** project (the one that produced `Glance.dc.html` and the boards). Run them **in order**: prompt 2 changes copy that prompts 1 and 3 build on. Each prompt asks for output in the same handoff format (prototype + URL param, board frames at the six sizes, behavior notes) so it drops straight into `docs/design/handoff/`.

| # | Prompt | Status |
|---|---|---|
| 1 | [Event time entry and validation](prompts/01-time-entry.md) | ✅ Delivered in handoff v2 → spec §8.3.1 (`TPK-*`) |
| 2 | [Re-copy for a family audience](prompts/02-family-copy.md) | ✅ Delivered in handoff v2 → spec §10 |
| 3 | [Sign-up/sign-in flow + undesigned states](prompts/03-signin-and-system-states.md) | ✅ Delivered in handoff v3 → spec §8.1 (`SIGNIN-*`), PHOTO-06..09, WX-07..09 |
| 4 | [Session no longer valid](prompts/04-session-ended.md) | ✅ Delivered in handoff v4 → spec SIGNIN-13, AMB-07 (no board frames: the notes cite Account S–X, which weren't drawn; use the prototype's `signin=ended`) |
| 5 | [Location and time zone](prompts/05-location-and-time-zone.md) | ✅ Delivered in handoff v4 → spec LOC-01..09 (§9.9), SET-09, SIGNIN-14, WX-04/09, TODAY-08. v4 also added the Ambient screen page (SET-10), not requested, adopted |

All five prompts are delivered (handoff v4 in [`design/handoff/`](design/handoff/README.md)). Prompt 4 is built by execution plan H01, prompt 5 by L06–L08, and the Ambient screen page by H02–H03. Spec references: [`product-spec.md`](product-spec.md) — §8.3.1 (time entry), §10 (family copy), §8.1 / PHOTO-06..09 / WX-07..09 (sign-in, upload, location states), SIGNIN-13 (signed out), §9.9 (location and time zone), SET-10 (ambient schedule).

New prompts go in [`prompts/`](prompts/) as `NN-short-name.md`, with a row added above.
