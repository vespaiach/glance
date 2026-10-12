---
description: Run execution-plan tasks non-stop, one fresh subagent per task, until done or a hard stop
---

This command runs non-stop. You are the loop: you never write task code yourself. Each task runs in a fresh `general-purpose` subagent, so its file reads, test runs and CI logs stay out of your context. Never pause to report progress, ask whether to continue or wait for approval; stop only for the hard stops below. Keep your own replies to one line per task. Load `PushNotification`, `SendMessage` and `mcp__ccd_session_mgmt__get_usage` with ToolSearch before the first task.

## Loop

1. Run `node scripts/glance-next.mjs` and read the JSON line it prints.
2. Act on `action`:
   - `start`, `resume`, `merge`: spawn a fresh subagent with the Agent tool (description "<id> task"). Its prompt is the *Task agent* section below with `<action>`, `<id>`, `<title>`, `<branch>` and `<pr>` filled in from the JSON. Wait for its final reply and handle its last line:
     - `MERGED: <pr>`: push-notify "<id> ✅ merged #<pr>".
     - `QUESTION:` block: see *Hard stops*. Send the answer to the same agent with `SendMessage` so it keeps its context, then handle its new reply the same way.
     - `STOP: <reason>` or anything else: a hard stop.
   - `done`: push-notify "All plan tasks ✅" and end.
   - `blocked`, `error`: a hard stop.
3. **Main context check:** call `get_usage` (`session_id` "self") from this main loop, never from a subagent; it reports this session's own context window, not the subagents'. Don't track subagent context. The first time `context.percentUsed` is 50 or more, push-notify "glance-next: main context at <n>%" and keep going.
4. Go back to step 1.

## Hard stops

Push-notify "STOP <id>: <reason>", then ask me with `AskUserQuestion` (the question, 2–3 lines of context, the options). Pass the answer back to the agent with `SendMessage`, or for `blocked` and `error` act on it yourself, then continue the loop.

## Task agent

> You are the task agent for `<id>` (`<title>`) in a non-stop loop. Action: `<action>`, branch `<branch>`, PR `<pr>`. Run in this worktree. Never pause for approval.
>
> 1. **Check out.** The working tree must be clean; if it isn't, end with `STOP: dirty working tree`. For `start`: pick a short slug from the title (like `tokens` for F03), `git fetch origin`, `git switch -c feat/<id>-<slug> origin/main`. For `resume` and `merge`: `git switch <branch>`, or `gh pr checkout <pr>` if it isn't local, then `git pull --ff-only`. If git says the branch is checked out in another worktree, end with `STOP: <branch> is checked out in another worktree`. Run `npm ci`. For `resume`, read the PR description, the row in the branch's `docs/execution-plan.md` and the commits since `origin/main` to see where the task stands. For `merge`, go to step 5.
> 2. **Do the task** from `docs/execution-plan.md` until the row's "Done when" is met, following CLAUDE.md exactly: its Workflow (draft PR right away, first commit sets the row to 🔄 with the PR link), docs updates, TDD order, the four checks, and the plan's "Status tracking" rules. Do the whole task in this one PR; don't split it into new rows. For UI work, check it yourself with the built-in browser: screenshot `/dev/gallery` in all four seasons, and for features compare the screen with its `Glance Frames - *` board at the six sizes, then fix the differences.
> 3. **Decisions:** for every choice, take the option you'd recommend. Decisions, schema, API and structure changes go in `tech-design.md` as CLAUDE.md says. Log every other choice in the PR description under "Decisions" (the choice and a one-line reason). Read review comments with `gh pr view <pr> --comments` before marking the PR ready and before merging: apply the ones you agree with and log why you skipped the others.
> 4. **Finish:** set the row to ✅, merge in the latest `origin/main`, push and mark the PR ready. Later fix and merge commits keep the row ✅.
> 5. **Wait for CI:** give GitHub about 30 seconds after the push, then run `gh pr checks <pr> --watch`. "no checks reported" means CI hasn't started yet, not red: wait and run it again. If CI is red, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), push and wait again, up to 3 attempts; then end with `STOP: CI still red after 3 fixes`.
> 6. **Merge:** when CI is green, run `git switch --detach origin/main` first (`main` is checked out in another worktree, so `gh` can't switch this one to it), then `gh pr merge <pr> --merge --delete-branch`. If GitHub reports a merge conflict, check out the branch, merge in the latest `origin/main`, resolve, push and go back to step 5, up to 3 times; then end with `STOP: merge still conflicts`. Then `git fetch origin` and confirm the row is ✅ on `origin/main`; if it isn't, end with `STOP: row not ✅ after merge`.
> 7. **Clean up:** `git switch --detach origin/main` and `npm ci`, so the worktree is clean for the next task.
>
> Ask only when you can't form a recommendation: the answer needs something only the owner has (a product decision the spec and tech design don't settle, a credential, an external account or a paid service), or the docs contradict each other and nothing says which wins. Then commit and push any work in progress and end your reply with:
> `QUESTION: <one question>`
> `CONTEXT: <2-3 lines>`
> `OPTIONS: <option> | <option> | ...`
> The answer will arrive in this same conversation; continue from where you stopped.
>
> Never push to `main` or force-push. Merge only this task's PR, with green CI. `main` has no branch protection, so your CI check is the only gate. Your last line must be `MERGED: <pr>`, `STOP: <reason>` or the QUESTION block.
