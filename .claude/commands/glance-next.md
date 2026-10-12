---
description: Start or resume the next task from docs/execution-plan.md
---

Run `node scripts/glance-next.mjs` and read the JSON line it prints. Then act on `action`:

- `start`:
  1. Make sure the working tree is clean. Pick a short slug from `title` (like `feat/F03-tokens`), run `git fetch origin` and `git switch -c feat/<id>-<slug> origin/main`. If git says the branch is checked out in another worktree, stop and tell me to archive that session.
  2. Execute task `id` from `docs/execution-plan.md` in this session, following CLAUDE.md exactly: its Workflow (draft PR right away, first commit sets the row to 🔄 with the PR link), docs updates, TDD order with both owner-approval stops, the four checks, and the plan's "Status tracking" rules.
  3. When the draft PR is open, bind it to this session (`ccd_pr` `get_status`, then `bind_pr` if it doesn't show the PR). Show me relayed review comments instead of acting on them.
  4. Finish as CLAUDE.md's Workflow says: the last commit sets the row to ✅, merge in the latest `origin/main`, push and mark the PR ready. Then wait for CI with `gh pr checks <pr> --watch` (run it in the background). If CI is red, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), push and wait again, up to 3 attempts. After that, stop and notify me. When CI is green, run `gh pr merge <pr> --merge --delete-branch`, then `git fetch origin` and confirm the row is ✅ on `origin/main`. If the merge fails or the row isn't ✅, stop and notify me.
  5. Push-notify "<ID> ✅ merged #<pr>", switch this worktree to detached `origin/main` so the merged branch is free, then run `/glance-next` again with the Skill tool.
- `resume`: check out `branch` as in step 1 (`git switch <branch>`, or `gh pr checkout <pr>` if it is not local yet, then `git pull --ff-only`). Read the PR description, the row in the branch's `docs/execution-plan.md` and the branch's commits since `origin/main`. Tell me where the session stopped and ask whether to continue. Do not continue until I answer.
- `merge`: the PR at `url` is ready. Check it out, then run `start` step 4 from "wait for CI" onwards, then step 5.
- `blocked`, `done`, `error`: explain in two lines what I need to do, then stop.

At every owner stop, send me a push notification with the PushNotification tool naming the stop (for example "F04: test list ready"). Then wait for my answer.

Never push to `main` or force-push. Merge only task PRs, with green CI, the way step 4 says.
