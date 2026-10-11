# Claude Design prompts — Glance

Paste each prompt into Claude Design in the **Glance** project (the one that produced `Glance.dc.html` and the boards). Run them **in order**: prompt 2 changes copy that prompts 1 and 3 build on. Each prompt asks for output in the same handoff format (prototype + URL param, board frames at the six sizes, behavior notes) so it drops straight into `docs/design/handoff/`.

| # | Prompt | Status |
|---|---|---|
| 1 | [Event time entry and validation](prompts/01-time-entry.md) | ✅ Delivered in handoff v2 → spec §8.3.1 (`TPK-*`) |
| 2 | [Re-copy for a family audience](prompts/02-family-copy.md) | ✅ Delivered in handoff v2 → spec §10 |
| 3 | [Sign-up/sign-in flow + undesigned states](prompts/03-signin-and-system-states.md) | ✅ Delivered in handoff v3 → spec §8.1 (`SIGNIN-*`), PHOTO-06..09, WX-07..09 |

All three prompts are delivered. Spec references: [`product-spec.md`](product-spec.md) — §8.3.1 (time entry), §10 (family copy), §8.1 / PHOTO-06..09 / WX-07..09 (sign-in, upload, location states).

New prompts go in [`prompts/`](prompts/) as `NN-short-name.md`, with a row added above.
