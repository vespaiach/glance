---
description: Run execution-plan tasks non-stop, from docs/execution-plan.md, until done or a hard stop
---

This command runs non-stop. Never pause to report progress, ask whether to continue or wait for approval. The only reasons to stop are the hard stops below. Keep each reply to a one-line summary per step so the session's context lasts across tasks. Load `PushNotification` with ToolSearch before the first notification.

Run `node scripts/glance-next.mjs` and read the JSON line it prints. Then act on `action`:

- `start`:
  1. Make sure the working tree is clean. Pick a short slug from `title` (like `tokens` for F03), run `git fetch origin`, `git switch -c feat/<id>-<slug> origin/main` and `npm ci`.
  2. Execute task `id` from `docs/execution-plan.md` in this session until the row's "Done when" is met, following CLAUDE.md exactly: its Workflow (draft PR right away, first commit sets the row to 🔄 with the PR link), docs updates, TDD order, the four checks, and the plan's "Status tracking" rules. Do the whole task in this one PR; don't split it into new rows. For UI work, check it yourself with the built-in browser instead of leaving it for manual review: screenshot `/dev/gallery` in all four seasons, and for features compare the screen with its `Glance Frames - *` board at the six sizes, then fix the differences.
  3. When the draft PR is open, bind it to this session (`ccd_pr` `get_status`, then `bind_pr` if it doesn't show the PR). Handle relayed review comments with the Decisions rule below.
  4. Finish: set the row to ✅, merge in the latest `origin/main`, push and mark the PR ready. Later fix and merge commits keep the row ✅.
  5. Wait for CI: give GitHub about 30 seconds after the push, then run `gh pr checks <pr> --watch` in the background. "no checks reported" means CI hasn't started yet, not red: wait and run it again. If CI is red, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), push and wait again, up to 3 attempts.
  6. Merge: when CI is green, run `git switch --detach origin/main` first (`main` is checked out in another worktree, so `gh` can't switch this one to it), then `gh pr merge <pr> --merge --delete-branch`. If GitHub reports a merge conflict, check out the branch, merge in the latest `origin/main`, resolve, push and go back to step 5, up to 3 times. Then `git fetch origin` and confirm the row is ✅ on `origin/main`.
  7. Push-notify "<ID> ✅ merged #<pr>", run `git switch --detach origin/main` and `npm ci`, then run `/glance-next` again with the Skill tool.
- `resume`: check out `branch` (`git switch <branch>`, or `gh pr checkout <pr>` if it is not local yet, then `git pull --ff-only`) and run `npm ci`. Read the PR description, the row in the branch's `docs/execution-plan.md` and the branch's commits since `origin/main` to see where the task stands, then continue it from there through `start` steps 2–7.
- `merge`: the PR at `url` is ready. Check it out, run `npm ci`, then run `start` steps 5–7.
- `done`: push-notify "All plan tasks ✅" and end.

Decisions: for every choice, take the option you'd recommend. Decisions, schema, API and structure changes go in `tech-design.md` as CLAUDE.md says. Log every other choice in the PR description under "Decisions" (the choice and a one-line reason). That includes review comments: apply the ones you agree with and log why you skipped the others.

Hard stops. Stop only for these. Commit and push any work in progress first, push-notify "STOP <ID>: <reason>", then ask me with `AskUserQuestion` (the question, 2–3 lines of context, your options) and continue from where you stopped once I answer:
- The answer needs something only I have: a product decision the spec and tech design don't settle, a credential, an external account or a paid service.
- The docs contradict each other and nothing says which wins.
- CI is still red after 3 fix attempts, or the merge still conflicts after 3 attempts.
- The working tree is dirty at `start`, or git says the branch is checked out in another worktree (another session may own it).
- After the merge, the row isn't ✅ on `origin/main`.
- The script prints `blocked` (no task can start) or `error`.

Never push to `main` or force-push. Merge only task PRs, with green CI, the way step 6 says. `main` has no branch protection, so your CI check is the only gate.
