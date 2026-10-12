#!/usr/bin/env node
// Decides the next task of docs/execution-plan.md for .claude/commands/glance-next.md.
// Prints one JSON line and changes nothing.
//
//   node scripts/glance-next.mjs
//
// Reads only origin/main (after a git fetch) and the open PRs, so any worktree gives the same answer.
// On main a row is ⬜ or ✅. Work in progress is an open PR on a feat/<ID>-* branch.
//
//   {"action":"start","id","title","phase"}          first ⬜ row with no open PR whose deps are all ✅
//   {"action":"resume","id","branch","pr","url"}     a task PR is open and still a draft
//   {"action":"merge","id","pr","url"}               a task PR is open and marked ready
//   {"action":"blocked","waiting":[{"id","deps"}]}   ⬜ rows remain but none has its deps ✅
//   {"action":"done"}                                every row is ✅
//   {"action":"error","why"}                         the plan doesn't match these rules (exit 1)

import { execFileSync } from "node:child_process";

const PLAN = "docs/execution-plan.md";
const ID = /\b[A-Z]\d{2}[a-z]?\b/g;

function run(cmd, ...args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function finish(result, code = 0) {
  console.log(JSON.stringify(result));
  process.exit(code);
}

function cells(line) {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function parsePlan(text) {
  const rows = [];
  let phase = null;
  let sharedDeps = [];
  let depsColumn = -1;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      phase = line.slice(3).trim();
      sharedDeps = [];
      depsColumn = -1;
    }
    const shared = line.match(/^All depend on \*\*([A-Z]\d{2}[a-z]?)\*\*/);
    if (shared) sharedDeps = [shared[1]];
    if (!line.startsWith("|")) continue;
    const row = cells(line);
    if (row[0] === "ID") {
      depsColumn = row.findIndex((name) => name === "Depends on" || name === "Extra deps");
      continue;
    }
    if (depsColumn === -1 || !/^[A-Z]\d{2}[a-z]?$/.test(row[0])) continue;
    rows.push({
      id: row[0],
      done: row[1].startsWith("✅"),
      title: row[2].match(/\*\*(.+?)\*\*/)?.[1].replace(/[:.]$/, "") ?? row[2],
      phase,
      rawDeps: row[depsColumn],
      sharedDeps,
    });
  }
  return rows;
}

function expandDeps(row, rows) {
  const deps = new Set(row.sharedDeps);
  const phase = row.rawDeps.match(/^Phase (\d+)$/);
  if (phase) {
    for (const other of rows) if (other.phase.startsWith(`Phase ${phase[1]} `)) deps.add(other.id);
    return [...deps];
  }
  for (const [, prefix, from, to] of row.rawDeps.matchAll(/\b([A-Z])(\d{2})\.\.[A-Z]?(\d{2})\b/g)) {
    for (let n = Number(from); n <= Number(to); n++) deps.add(`${prefix}${String(n).padStart(2, "0")}`);
  }
  for (const id of row.rawDeps.match(ID) ?? []) deps.add(id);
  return [...deps];
}

run("git", "fetch", "--quiet", "origin");

let plan;
try {
  plan = run("git", "show", `origin/main:${PLAN}`);
} catch {
  finish({ action: "error", why: `${PLAN} is missing on origin/main` }, 1);
}

const rows = parsePlan(plan);
if (rows.length === 0) finish({ action: "error", why: `no task rows found in ${PLAN}` }, 1);
const known = new Map(rows.map((row) => [row.id, row]));
for (const row of rows) {
  row.deps = expandDeps(row, rows);
  const unknown = row.deps.filter((id) => !known.has(id));
  if (unknown.length) finish({ action: "error", why: `${row.id} depends on unknown ${unknown.join(", ")}` }, 1);
}

const prs = JSON.parse(run("gh", "pr", "list", "--state", "open", "--json", "number,headRefName,isDraft,url"));
const prOf = (id) => prs.find((pr) => pr.headRefName.startsWith(`feat/${id}-`));

for (const row of rows.filter((r) => !r.done)) {
  const pr = prOf(row.id);
  if (!pr) continue;
  if (pr.isDraft) finish({ action: "resume", id: row.id, branch: pr.headRefName, pr: pr.number, url: pr.url });
  finish({ action: "merge", id: row.id, pr: pr.number, url: pr.url });
}

const todo = rows.filter((row) => !row.done);
if (todo.length === 0) finish({ action: "done" });

const next = todo.find((row) => row.deps.every((id) => known.get(id).done));
if (!next) {
  const waiting = todo.map((row) => ({ id: row.id, deps: row.deps.filter((id) => !known.get(id).done) }));
  finish({ action: "blocked", waiting });
}

finish({ action: "start", id: next.id, title: next.title, phase: next.phase });
