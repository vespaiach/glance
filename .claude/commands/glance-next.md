---
description: Run execution-plan tasks non-stop, from docs/execution-plan.md, until done or a hard stop
---

This command runs non-stop. Never pause to report progress, ask whether to continue or wait for approval. The only reasons to stop are the hard stops below.

Run `node scripts/glance-next.mjs` and read the JSON line it prints. Then act on `action`:

- `start`:
  1. Make sure the working tree is clean. Pick a short slug from `title` (like `feat/F03-tokens`), run `git fetch origin` and `git switch -c feat/<id>-<slug> origin/main`.
  2. Execute task `id` from `docs/execution-plan.md` in this session, following CLAUDE.md exactly: its Workflow (draft PR right away, first commit sets the row to 🔄 with the PR link), docs updates, TDD order, the four checks, and the plan's "Status tracking" rules.
  3. When the draft PR is open, bind it to this session (`ccd_pr` `get_status`, then `bind_pr` if it doesn't show the PR). Handle relayed review comments with the Decisions rule below.
  4. Finish as CLAUDE.md's Workflow says: the last commit sets the row to ✅, merge in the latest `origin/main`, push and mark the PR ready. Then wait for CI with `gh pr checks <pr> --watch` (run it in the background). If CI is red, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), push and wait again, up to 3 attempts. When CI is green, run `gh pr merge <pr> --merge --delete-branch`. If the merge fails because `main` moved or conflicts, merge in the latest `origin/main`, resolve, push and go back to waiting for CI. Then `git fetch origin` and confirm the row is ✅ on `origin/main`.
  5. Push-notify "<ID> ✅ merged #<pr>", switch this worktree to detached `origin/main` so the merged branch is free, then run `/glance-next` again with the Skill tool.
- `resume`: check out `branch` (`git switch <branch>`, or `gh pr checkout <pr>` if it is not local yet, then `git pull --ff-only`). Read the PR description, the row in the branch's `docs/execution-plan.md` and the branch's commits since `origin/main` to see where the task stands, then continue it from there through `start` steps 2–5.
- `merge`: the PR at `url` is ready. Check it out, then run `start` step 4 from "wait for CI" onwards, then step 5.
- `done`: push-notify "All plan tasks ✅" and end.

Decisions: for every choice, take the option you'd recommend and log it in the PR description under "Decisions" (the choice and a one-line reason). That includes review comments: apply the ones you agree with and log why you skipped the others.

Hard stops. Stop only for these. Commit and push any work in progress first, push-notify "STOP <ID>: <reason>", then ask me with `AskUserQuestion` (the question, 2–3 lines of context, your options) and continue from where you stopped once I answer:
- The answer needs something only I have: a product decision the spec and tech design don't settle, a credential, an external account or a paid service.
- The docs contradict each other and nothing says which wins.
- CI is still red after 3 fix attempts.
- The working tree is dirty at `start`, or git says the branch is checked out in another worktree (another session may own it).
- After the merge, the row isn't ✅ on `origin/main`.
- The script prints `blocked` (no task can start) or `error`.

Never push to `main` or force-push. Merge only task PRs, with green CI, the way step 4 says.
