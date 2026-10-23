---
description: Run execution-plan tasks non-stop, one fresh subagent per task, until done or a hard stop
---

This command runs non-stop. You are the loop: you never write task code yourself. Each task runs in a fresh `general-purpose` subagent, so its file reads, test runs and check output stay out of your context. Never pause to report progress, ask whether to continue or wait for approval; stop only for the hard stops below. Keep your own replies to one line per task. Load `PushNotification`, `SendMessage` and `mcp__ccd_session_mgmt__get_usage` with ToolSearch before the first task. Also before the first task, run `git fetch origin` and `git cat-file -e origin/main:.claude/commands/glance-next.md`; if it fails, this command isn't on `main` yet, so hard-stop with "merge the tooling change first".

## Loop

1. Run `node scripts/glance-next.mjs` and read the JSON line it prints.
2. Act on `action`:
   - `start`, `resume`: spawn a fresh subagent with the Agent tool (description "<id> task"). Its prompt is the *Task agent* section below. Fill in only its first line, with `<action>`, `<id>`, `<title>` and `<branch>` from the JSON, and write "none" for a field the JSON doesn't have. Leave every other `<…>` in it as it is. Wait for its final reply and handle its last line:
     - `MERGED: <sha>`: push-notify "<id> ✅ merged <sha>".
     - `QUESTION:` block: see *Hard stops*. Send the answer to the same agent with `SendMessage` so it keeps its context, then handle its new reply the same way.
     - `STOP: <reason>` or anything else: a hard stop.
   - `done`: push-notify "All plan tasks ✅" and end.
   - `blocked`, `error`: a hard stop.
3. **Main context check:** call `get_usage` (`session_id` "self") from this main loop, never from a subagent; it reports this session's own context window, not the subagents'. Don't track subagent context. The first time `context.percentUsed` is 50 or more, push-notify "glance-next: main context at <n>%", write "Context alert sent at <n>%" in your reply so it survives a summary, and keep going. Don't alert again once that line is in your context.
4. Go back to step 1.

## Hard stops

Push-notify "STOP <id>: <reason>", then ask me with `AskUserQuestion` (the question, 2–3 lines of context, the options). Pass the answer back to the agent with `SendMessage`, or for `blocked` and `error` act on it yourself, then continue the loop.

## Task agent

> You are the task agent for `<id>` (`<title>`) in a non-stop loop. Action: `<action>`, branch `<branch>`. Run in this worktree. Never pause for approval.
>
> **No PRs and no CI for now.** This overrides CLAUDE.md's Workflow and the plan's "Status tracking": don't open a PR, and GitHub CI is off. You merge the task branch into `main` yourself, gated only by the local checks. Status rows carry no PR link: `🔄` while in progress, `✅` when done.
>
> 1. **Check out.** The working tree must be clean; if it isn't, end with `STOP: dirty working tree`. For `start`: pick a short slug from the title (like `tokens` for F03), `git fetch origin`, `git switch -c feat/<id>-<slug> origin/main`. For `resume`: `git switch <branch>` (it tracks `origin/<branch>`), then `git pull --ff-only`. If git says the branch is checked out in another worktree, end with `STOP: branch checked out in another worktree`. Run `npm ci`. For `resume`, read the row in the branch's `docs/execution-plan.md`, the commit messages and the diff since `origin/main` to see where the task stands.
> 2. **Do the task** from `docs/execution-plan.md` until the row's "Done when" is met, following CLAUDE.md exactly except for PRs: the first commit sets the row to 🔄 and is pushed right away with `git push -u origin HEAD` (the pushed branch is how the loop finds work in progress); then docs updates, TDD order and the four checks. Push after each commit. Do the whole task on this one branch; don't split it into new rows. For UI work, check it yourself with the built-in browser: start the app with `preview_start` (`name` "dev", from `.claude/launch.json`). Once F11 is ✅ on `origin/main`, screenshot `/dev/gallery` in all four seasons; before that, components are added to the gallery in F11. For features, compare the screen with `docs/design/handoff/Glance States.dc.html` and its side page (`Glance Today Layout`, `Glance Notice Board`, …) at the three sizes (large 1920×1080, normal 1024×768, small 390×844), then fix the differences.
> 3. **Decisions:** for every choice, take the option you'd recommend. Decisions, schema, API and structure changes go in `tech-design.md` as CLAUDE.md says. Log every other choice in a commit message body under "Decisions" (the choice and a one-line reason).
> 4. **Finish:** set the row to ✅ and commit, then `git fetch origin` and merge in the latest `origin/main`.
> 5. **Checks:** run `npm run check`, `npm run typecheck`, `npm test` and `npm run build`, in that order, on the branch with `origin/main` merged in. Every one must exit 0 with no errors. If one fails, fix the root cause per CLAUDE.md (never weaken or skip tests or lint rules), commit, and run all four again from the start, up to 3 fix rounds; then push and end with `STOP: checks still failing after 3 fixes`.
> 6. **Merge:** push the branch. Then `git switch --detach origin/main`, `git merge --no-ff <branch> -m "Merge <branch>: <id> <title>"` and `git push origin HEAD:main` (`main` is checked out in another worktree, so merge on a detached HEAD). If the push is rejected because `main` moved, `git fetch origin`, switch back to the branch, merge in `origin/main` and go back to step 5. If the merge conflicts, resolve it on the branch the same way. Give up after 3 such rounds with `STOP: main keeps moving or conflicting`. Note the merge commit (`git rev-parse --short HEAD`), delete the task branch with `git push origin --delete <branch>` and `git branch -D <branch>`, then `git fetch origin` and confirm the row is ✅ on `origin/main`; if it isn't, end with `STOP: row not ✅ after merge`.
> 7. **Clean up:** `git switch --detach origin/main` and `npm ci`, so the worktree is clean for the next task.
>
> Ask only when you can't form a recommendation: the answer needs something only the owner has (a product decision the spec and tech design don't settle, a credential, an external account or a paid service), or the docs contradict each other and nothing says which wins. Then commit and push any work in progress to the task branch and end your reply with:
> `QUESTION: <one question>`
> `CONTEXT: <2-3 lines>`
> `OPTIONS: <option> | <option> | ...`
> The answer will arrive in this same conversation; continue from where you stopped.
>
> Never force-push, and push to `main` only the `--no-ff` merge of this task's branch from step 6, after all four checks pass on exactly that code. CI is off and `main` has no branch protection, so your local checks are the only gate. Your last line must be `MERGED: <sha>`, `STOP: <reason>` or the QUESTION block.
