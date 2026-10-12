#!/usr/bin/env bash
# Deterministic steps for the /run-phase loop (.claude/skills/run-phase/SKILL.md).
#
#   scripts/run-phase.sh tasks <phase>      ⬜ task IDs of a phase on origin/main, in file order
#   scripts/run-phase.sh prepare            fetch, require a clean tree, detach at origin/main
#   scripts/run-phase.sh pr <ID>            "<number> <isDraft>" of the open feat/<ID>-* PR, or nothing
#   scripts/run-phase.sh ci <PR>            wait for checks; exit 0 green, 1 red
#   scripts/run-phase.sh merge <ID> <PR>    mark ready, merge, verify the row is ✅ on origin/main

set -euo pipefail

PLAN=docs/execution-plan.md
cd "$(git rev-parse --show-toplevel)"

die() { echo "STOP: $*" >&2; exit 1; }

plan_on_main() { git show "origin/main:$PLAN"; }

cmd_tasks() {
  local phase="${1:?phase number required}"
  git fetch origin --quiet
  plan_on_main | awk -v p="## Phase $phase " '
    index($0, p) == 1 { inside = 1; next }
    /^## / { inside = 0 }
    inside && /^\| [A-Z][0-9]+[a-z]? \| ⬜/ { print $2 }
  '
}

cmd_prepare() {
  git fetch origin --prune --quiet
  [[ -z "$(git status --porcelain)" ]] || die "working tree is dirty"
  git switch --detach --quiet origin/main
}

cmd_pr() {
  local id="${1:?task ID required}"
  gh pr list --state open --json number,isDraft,headRefName \
    --jq ".[] | select(.headRefName | startswith(\"feat/$id-\")) | \"\(.number) \(.isDraft)\"" | head -n1
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
  cmd_prepare
  plan_on_main | grep -q "^| $id | ✅" || die "#$pr merged, but $id isn't ✅ on origin/main"
  echo "$id ✅ merged #$pr"
}

sub="${1:-}"; shift || true
case "$sub" in
  tasks|prepare|pr|ci|merge) "cmd_$sub" "$@" ;;
  *) sed -n '2,8p' "$0"; exit 2 ;;
esac
