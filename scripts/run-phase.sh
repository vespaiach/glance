#!/usr/bin/env bash
# Steps for the /run-phase loop (.claude/skills/run-phase/SKILL.md).
# Tasks run in one reused worktree, each in a fresh `claude -p` process (clean context).
#
#   scripts/run-phase.sh tasks <phase>        ⬜ task IDs of a phase on origin/main, in file order
#   scripts/run-phase.sh prepare              create the worktree once; reset it to origin/main; npm ci
#   scripts/run-phase.sh pr <ID>              "<number> <isDraft>" of the open feat/<ID>-* PR, or nothing
#   scripts/run-phase.sh task <ID>            run a fresh task agent for <ID>
#   scripts/run-phase.sh fix <ID> <PR> <k>    run a fresh fix agent for red CI on <PR>
#   scripts/run-phase.sh answer <name> <msg>  resume agent <name> (e.g. F04-task) with the owner's answer
#   scripts/run-phase.sh ci <PR>              wait for checks; exit 0 green, 1 red
#   scripts/run-phase.sh merge <ID> <PR>      mark ready, merge, verify the row is ✅ on origin/main
# Env: RUN_PHASE_WORKTREE (default ~/worktrees/glance-app/run-phase)

set -euo pipefail

PLAN=docs/execution-plan.md
REPO="$(git rev-parse --show-toplevel)"
WORKTREE="${RUN_PHASE_WORKTREE:-$HOME/worktrees/glance-app/run-phase}"
LOGS="$WORKTREE-logs"

die() { echo "STOP: $*" >&2; exit 1; }

plan_on_main() { git -C "$REPO" show "origin/main:$PLAN"; }

cmd_tasks() {
  local phase="${1:?phase number required}"
  git -C "$REPO" fetch origin --quiet
  plan_on_main | awk -v p="## Phase $phase " '
    index($0, p) == 1 { inside = 1; next }
    /^## / { inside = 0 }
    inside && /^\| [A-Z][0-9]+[a-z]? \| ⬜/ { print $2 }
  '
}

cmd_prepare() {
  git -C "$REPO" fetch origin --prune --quiet
  [[ -d "$WORKTREE" ]] || git -C "$REPO" worktree add --detach --quiet "$WORKTREE" origin/main
  mkdir -p "$LOGS"
  cd "$WORKTREE"
  [[ -z "$(git status --porcelain)" ]] || die "worktree $WORKTREE is dirty"
  git switch --detach --quiet origin/main
  npm ci --silent --no-audit --no-fund
  echo "worktree ready at $(git rev-parse --short HEAD)"
}

cmd_pr() {
  local id="${1:?task ID required}"
  gh pr list --state open --json number,isDraft,headRefName \
    --jq ".[] | select(.headRefName | startswith(\"feat/$id-\")) | \"\(.number) \(.isDraft)\"" | head -n1
}

run_claude() {
  local name="$1"; shift
  cd "$WORKTREE"
  claude -p "$@" --permission-mode bypassPermissions --output-format stream-json --verbose \
    >> "$LOGS/$name.jsonl" || true
  local final
  final="$(jq -c 'select(.type == "result")' "$LOGS/$name.jsonl" | tail -n1)"
  [[ -n "$final" ]] || die "$name produced no result (log: $LOGS/$name.jsonl)"
  jq -r '.session_id' <<<"$final" > "$LOGS/$name.sid"
  jq -r '.result' <<<"$final"
}

cmd_task() {
  local id="${1:?task ID required}"
  run_claude "$id-task" "$(task_prompt "$id")"
}

cmd_fix() {
  local id="${1:?task ID required}" pr="${2:?PR number required}" k="${3:?attempt required}"
  run_claude "$id-fix$k" "$(fix_prompt "$id" "$pr")"
}

cmd_answer() {
  local name="${1:?agent name required}" msg="${2:?answer required}"
  [[ -f "$LOGS/$name.sid" ]] || die "no session recorded for $name"
  run_claude "$name" --resume "$(cat "$LOGS/$name.sid")" \
    "Owner's answer: $msg. Continue the task from where you stopped, and end with the same final-line contract."
}

cmd_ci() {
  local pr="${1:?PR number required}" status
  for _ in $(seq 1 20); do
    set +e
    gh pr checks "$pr" --watch --fail-fast --interval 30 >/dev/null 2>&1
    status=$?
    set -e
    [[ $status -eq 0 ]] && { echo "CI green on #$pr"; return 0; }
    [[ $status -eq 1 ]] && { echo "CI red on #$pr"; gh pr checks "$pr" || true; return 1; }
    sleep 15
  done
  die "no CI result for #$pr"
}

cmd_merge() {
  local id="${1:?task ID required}" pr="${2:?PR number required}"
  gh pr ready "$pr" >/dev/null 2>&1 || true
  gh pr merge "$pr" --merge --delete-branch >/dev/null || die "merge failed for #$pr"
  git -C "$REPO" fetch origin --quiet
  plan_on_main | grep -q "^| $id | ✅" || die "#$pr merged, but $id isn't ✅ on origin/main"
  echo "$id ✅ merged #$pr"
}

decisions_rule() {
  cat <<'EOF'
DECISIONS. You run unattended: never stop for approval. For every choice, take the option you would recommend and log it in the PR description under "Decisions" (the choice plus a one-line reason). Ask only when you cannot form a recommendation: the answer needs information only the owner has (a product decision the spec and tech design don't settle, a credential, an external account), or the docs contradict each other and nothing says which one wins. Then commit and push any work in progress if a branch exists, and end your reply with:
QUESTION: <one question>
CONTEXT: <2-3 lines>
OPTIONS: <option> | <option> | ...
The answer will arrive in this same conversation. Continue from where you stopped.
EOF
}

task_prompt() {
  local id="$1"
  cat <<EOF
You are the task agent for $id in an automated loop. A separate loop handles CI and merging. Execute task $id from $PLAN, following CLAUDE.md and the plan's "Status tracking" rules, with these overrides.

$(decisions_rule)

TDD. CLAUDE.md's owner-approval stops are skipped. Keep the order (list tests → write them and confirm each fails for the expected reason → minimum code → refactor). Put the test list and a summary of the failing run in the PR description under "Test plan" and "Red run". If the task has no testable behavior, say so there.

STEPS
1. \`git fetch origin\`. If an open PR exists for a \`feat/$id-*\` branch, \`gh pr checkout\` it and continue from where it stands. Otherwise check on origin/main that every dependency of $id is ✅ (if not, reply \`BLOCKED: <reason>\` and stop), then \`git switch -c feat/$id-<slug> origin/main\` and open a draft PR titled "$id: <short title>". Its first commit sets the row to 🔄 with the PR link.
2. Implement until the row's "Done when" is met. Update product-spec.md and tech-design.md in the same PR where CLAUDE.md requires it. Don't split the task.
3. Run \`npm run check\` → \`npm run typecheck\` → \`npm test\` → \`npm run build\` and fix every failure.
4. The last commit sets the row to ✅ with the PR link. Merge in the latest origin/main, push, then \`gh pr ready\`.
5. Don't wait for CI and don't merge. Leave the worktree clean.

Your last line must be \`RESULT: <PR url>\`, \`BLOCKED: <reason>\` or the QUESTION block.
EOF
}

fix_prompt() {
  local id="$1" pr="$2"
  cat <<EOF
You are a fix agent in an automated loop. CI failed on PR #$pr (task $id). \`gh pr checkout $pr\`, read the failure with \`gh pr checks $pr\` and \`gh run view <run-id> --log-failed\`, and fix the root cause following CLAUDE.md. Never weaken or skip tests or disable lint rules to get green. Run \`npm run check\` → \`npm run typecheck\` → \`npm test\` → \`npm run build\`, then commit and push. Keep the $id row ✅. Don't merge. Leave the worktree clean.

$(decisions_rule)

Your last line must be \`FIXED: <one line>\`, \`GAVE UP: <reason>\` or the QUESTION block.
EOF
}

sub="${1:-}"; shift || true
case "$sub" in
  tasks|prepare|pr|task|fix|answer|ci|merge) "cmd_$sub" "$@" ;;
  *) sed -n '2,14p' "$0"; exit 2 ;;
esac
