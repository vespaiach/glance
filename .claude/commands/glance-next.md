---
description: Run execution-plan tasks non-stop, one fresh subagent per task, until done or a hard stop
---

This command runs non-stop. You are the loop: you never write task code yourself. Each task runs in a fresh `general-purpose` subagent, so its file reads, test runs and CI logs stay out of your context. Never pause to report progress, ask whether to continue or wait for approval; stop only for the hard stops below. Keep your own replies to one line per task. Load `PushNotification`, `SendMessage` and `mcp__ccd_session_mgmt__get_usage` with ToolSearch before the first task. Also before the first task, run `git fetch origin` and `git cat-file -e origin/main:.claude/commands/glance-next.md`; if it fails, this command isn't on `main` yet, so hard-stop with "merge the tooling PR first".

## Loop

1. Run `node scripts/glance-next.mjs` and read the JSON line it prints.
2. Act on `action`:
   - `start`, `resume`, `merge`: spawn a fresh subagent with the Agent tool (description "<id> task"). Its prompt is the *Task agent* section below. Fill in only its first line, with `<action>`, `<id>`, `<title>`, `<branch>` and `<pr>` from the JSON, and write "none" for a field the JSON doesn't have. Leave every other `<…>` in it as it is. Wait for its final reply and handle its last line:
     - `MERGED: <number>`: push-notify "<id> ✅ merged #<number>".
     - `QUESTION:` block: see *Hard stops*. Send the answer to the same agent with `SendMessage` so it keeps its context, then handle its new reply the same way.
     - `STOP: <reason>` or anything else: a hard stop.
   - `done`: push-notify "All plan tasks ✅" and end.
   - `blocked`, `error`: a hard stop.
3. **Main context check:** call `get_usage` (`session_id` "self") from this main loop, never from a subagent; it reports this session's own context window, not the subagents'. Don't track subagent context. The first time `context.percentUsed` is 50 or more, push-notify "glance-next: main context at <n>%", write "Context alert sent at <n>%" in your reply so it survives a summary, and keep going. Don't alert again once that line is in your context.
4. Go back to step 1.

## Hard stops

Push-notify "STOP <id>: <reason>", then ask me with `AskUserQuestion` (the question, 2–3 lines of context, the options). Pass the answer back to the agent with `SendMessage`, or for `blocked` and `error` act on it yourself, then continue the loop.

## Task agent

> You are the task agent for `<id>` (`<title>`) in a non-stop loop. Action: `<action>`, branch `<branch>`, PR `<pr>`. Run in this worktree. Never pause for approval.
>
> 1. **Check out.** The working tree must be clean; if it isn't, end with `STOP: dirty working tree`. For `start`: pick a short slug from the title (like `tokens` for F03), `git fetch origin`, `git switch -c feat/<id>-<slug> origin/main`. For `resume`: `git switch` to the branch named in the first line, or `gh pr checkout` the PR named there if the branch isn't local, then `git pull --ff-only`. For `merge`: `gh pr checkout` the PR named in the first line, then `git pull --ff-only`. If git says the branch is checked out in another worktree, end with `STOP: branch checked out in another worktree`. Run `npm ci`. For `resume`, read the PR description, the row in the branch's `docs/execution-plan.md` and the commits since `origin/main` to see where the task stands. For `merge`, go to step 5.
> 2. **Do the task** from `docs/execution-plan.md` until the row's "Done when" is met, following CLAUDE.md exactly: its Workflow (draft PR right away, first commit sets the row to 🔄 with the PR link), docs updates, TDD order, the four checks, and the plan's "Status tracking" rules. Do the whole task in this one PR; don't split it into new rows. For UI work, check it yourself with the built-in browser: start the app with `preview_start` (`name` "dev", from `.claude/launch.json`). Once F11 is ✅ on `origin/main`, screenshot `/dev/gallery` in all four seasons; before that, components are added to the gallery in F11. For features, compare the screen with its board in `docs/design/handoff/Glance Frames - *.dc.html` at the six sizes, then fix the differences.
> 3. **Decisions:** for every choice, take the option you'd recommend. Decisions, schema, API and structure changes go in `tech-design.md` as CLAUDE.md says. Log every other choice in the PR description under "Decisions" (the choice and a one-line reason). Read this task's PR review comments with `gh pr view --comments` before marking the PR ready: apply the ones you agree with and log why you skipped the others.
> 4. **Finish:** set the row to ✅, merge in the latest `origin/main`, push and mark the PR ready. Later fix and merge commits keep the row ✅.
> 5. **Wait for CI:** give GitHub about 30 seconds after the push, then run `gh pr checks --watch` with the Bash tool's 10-minute timeout. "no checks reported" means CI hasn't started yet, and a timeout means it is still running: neither is red, and neither counts as a fix attempt. Run it again. If CI is red, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), push and wait again, up to 3 attempts; then end with `STOP: CI still red after 3 fixes`.
> 6. **Merge:** when CI is green, read the review comments again as in step 3 and handle any new ones (a fix you push goes back to step 5). Note the PR number (`gh pr view --json number`), then run `git switch --detach origin/main` first (`main` is checked out in another worktree, so `gh` can't switch this one to it), then `gh pr merge <number> --merge --delete-branch`. If GitHub reports a merge conflict, check out the branch, merge in the latest `origin/main`, resolve, push and go back to step 5, up to 3 times; then end with `STOP: merge still conflicts`. Then `git fetch origin` and confirm the row is ✅ on `origin/main`; if it isn't, end with `STOP: row not ✅ after merge`.
> 7. **Clean up:** `git switch --detach origin/main` and `npm ci`, so the worktree is clean for the next task.
>
> Ask only when you can't form a recommendation: the answer needs something only the owner has (a product decision the spec and tech design don't settle, a credential, an external account or a paid service), or the docs contradict each other and nothing says which wins. Then commit and push any work in progress and end your reply with:
> `QUESTION: <one question>`
> `CONTEXT: <2-3 lines>`
> `OPTIONS: <option> | <option> | ...`
> The answer will arrive in this same conversation; continue from where you stopped.
>
> Never push to `main` or force-push. Merge only this task's PR, with green CI. `main` has no branch protection, so your CI check is the only gate. Your last line must be `MERGED: <number>`, `STOP: <reason>` or the QUESTION block.
