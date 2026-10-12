---
name: run-phase
description: Run every ⬜ task of one phase of docs/execution-plan.md in file order through PR, green CI and merge. Each task runs in a fresh `claude -p` process in one reused worktree. Usage /run-phase <phase-number>. Re-run to resume after a stop.
---

# Run phase

You are the loop. You never write task code yourself, and you don't use the Agent tool. Each task runs as a fresh `claude -p` process (clean context) in one reused worktree, through `scripts/run-phase.sh`. Run every `task`, `fix`, `answer` and `ci` call with `run_in_background: true` and wait for it to exit; they can take a long time. Load `PushNotification` with ToolSearch before the first task.

## Loop

1. `scripts/run-phase.sh tasks <N>` gives the ⬜ IDs in file order. If there are none, notify "Phase N complete" and stop.
2. For each ID, in order:
   1. **Prepare:** `scripts/run-phase.sh prepare` resets the worktree to origin/main. If it fails, **stop**.
   2. **Existing PR:** `scripts/run-phase.sh pr <ID>`. If it prints `<n> false` (a ready PR), go to step 4.
   3. **Task:** `scripts/run-phase.sh task <ID>`. Handle the last line of its output:
      - `RESULT: <url>`: go to step 4.
      - `QUESTION:` block: see *Questions* (the agent is `<ID>-task`).
      - `BLOCKED:` or anything else: **stop**.
   4. **CI:** `scripts/run-phase.sh ci <PR>`. If CI is green, go to step 5. If it's red, run `scripts/run-phase.sh prepare` and then `scripts/run-phase.sh fix <ID> <PR> <k>` for k = 1, 2, 3. Handle its reply as in step 3, then run step 4 again. If CI is still red after k = 3, or the reply is `GAVE UP:`, **stop**.
   5. **Merge:** `scripts/run-phase.sh merge <ID> <PR>`. If it fails, **stop**.
   6. **Notify:** send one line, e.g. "F04 ✅ merged #8 (3/8 in Phase 0)". Then move on to the next ID.

Keep only a one-line summary per task in your own replies. Logs are at `<worktree>-logs/<name>.jsonl`.

## Questions

Agents pick their own recommended option for every choice they can reason about. They return a `QUESTION:` block only when they can't recommend anything. When one does:

1. Push-notify: "<ID> needs your answer: <question>".
2. Ask the owner with `AskUserQuestion`, using the agent's question, context and options.
3. `scripts/run-phase.sh answer <agent-name> "<answer>"` resumes the same `claude` session, so the agent keeps its context. Handle the new output as in the step that started it.

## Stop

Push-notify "STOP <ID>: <reason> <PR link>". Then reply with what happened and what to do next, and leave any PR open. Running `/run-phase <N>` again resumes: tasks already ✅ are skipped, and an open PR is picked up (a draft goes to a fresh task agent, a ready one to CI).
