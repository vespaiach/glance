---
name: run-phase
description: Run every ⬜ task of one phase of docs/execution-plan.md in file order, one fresh subagent per task, through PR, green CI and merge. Usage /run-phase <phase-number>. Re-run to resume after a stop.
---

# Run phase

You are the orchestrator. You never write task code yourself. Each task runs in a fresh subagent, so its context starts clean. `scripts/run-phase.sh` does the deterministic steps. Load `PushNotification` with ToolSearch before the first task.

## Loop

1. `scripts/run-phase.sh tasks <N>` gives the ⬜ IDs in file order. If there are none, notify "Phase N complete" and stop.
2. For each ID, in order:
   1. **Prepare:** `scripts/run-phase.sh prepare`. If it fails, **stop**.
   2. **Existing PR:** `scripts/run-phase.sh pr <ID>`. If it prints `<n> false` (a ready PR), go to step 4.
   3. **Task agent:** spawn a `general-purpose` agent named `<ID>` with the *Task prompt* and wait for its notification. Handle its last line:
      - `RESULT: <url>`: go to step 4.
      - `QUESTION:` block: see *Questions*, then wait for the agent again.
      - `BLOCKED:` or anything else: **stop**.
   4. **CI:** run `scripts/run-phase.sh ci <PR>` with `run_in_background: true` and wait for it to exit. If CI is green, go to step 5. If it's red, spawn a fresh agent named `<ID>-fix<k>` with the *Fix prompt*, handling its reply as in step 3 (`FIXED:` means run step 4 again). After 3 red fix attempts, **stop**.
   5. **Merge:** `scripts/run-phase.sh merge <ID> <PR>`. If it fails, **stop**.
   6. **Notify:** send one line, e.g. "F04 ✅ merged #8 (3/8 in Phase 0)". Then move on to the next ID.

Between tasks, keep only a one-line summary per task in your own replies. Don't paste agent transcripts.

## Questions

Agents pick their own recommended option for every choice they can reason about. They return a `QUESTION:` block only when they can't recommend anything. When one does:

1. Push-notify: "<ID> needs your answer: <question>".
2. Ask the owner with `AskUserQuestion`, using the agent's question, context and options.
3. `SendMessage` to the same agent: "Owner's answer: <answer>. Continue the task from where you stopped." The agent keeps its context, and the loop goes on.

## Stop

Push-notify "STOP <ID>: <reason> <PR link>". Then reply with what happened and what to do next, and leave any PR open. Running `/run-phase <N>` again resumes: tasks already ✅ are skipped, and an open PR is picked up (a draft goes to the task agent, a ready one to CI).

## Task prompt

```
You are the task agent for <ID> in an automated loop. The orchestrator handles CI and merging. Execute task <ID> from docs/execution-plan.md, following CLAUDE.md and the plan's "Status tracking" rules, with these overrides.

DECISIONS. Never stop for approval. CLAUDE.md's TDD owner-approval stops are skipped: keep the order (list tests → write them and confirm each fails for the expected reason → minimum code → refactor), and put the test list and the failing-run summary in the PR description under "Test plan" and "Red run". For every choice, take the option you would recommend and log it in the PR description under "Decisions" (the choice plus a one-line reason). Ask only when you cannot form a recommendation: the answer needs information only the owner has (a product decision the spec and tech design don't settle, a credential, an external account), or the docs contradict each other and nothing says which one wins. Then commit and push any work in progress if a branch exists, and end your reply with:
QUESTION: <one question>
CONTEXT: <2-3 lines>
OPTIONS: <option> | <option> | ...
The answer arrives as a message. Continue from where you stopped.

STEPS
1. `git fetch origin`. If an open PR exists for a `feat/<ID>-*` branch, `gh pr checkout` it and continue from where it stands. Otherwise check on origin/main that every dependency of <ID> is ✅ (if not, reply `BLOCKED: <reason>` and stop), then `git switch -c feat/<ID>-<slug> origin/main` and open a draft PR titled "<ID>: <short title>". Its first commit sets the row to 🔄 with the PR link.
2. Implement until the row's "Done when" is met. Update product-spec.md and tech-design.md in the same PR where CLAUDE.md requires it. Don't split the task.
3. Run `npm run check` → `npm run typecheck` → `npm test` → `npm run build` and fix every failure.
4. The last commit sets the row to ✅ with the PR link. Merge in the latest origin/main, push, then `gh pr ready`.
5. Don't wait for CI and don't merge.

Your last line must be `RESULT: <PR url>`, `BLOCKED: <reason>` or the QUESTION block.
```

## Fix prompt

```
You are a fix agent in an automated loop. CI failed on PR #<PR> (task <ID>). `gh pr checkout <PR>`, read the failure with `gh pr checks <PR>` and `gh run view <run-id> --log-failed`, and fix the root cause following CLAUDE.md. Never weaken or skip tests or disable lint rules to get green. Run `npm run check` → `npm run typecheck` → `npm test` → `npm run build`, then commit and push. Keep the <ID> row ✅. Don't merge.

The same DECISIONS rule applies: pick your recommendation, and return a QUESTION block (QUESTION / CONTEXT / OPTIONS) only when you can't form one.

Your last line must be `FIXED: <one line>`, `GAVE UP: <reason>` or the QUESTION block.
```
