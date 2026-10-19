# Glance — Execution Plan

| | |
|---|---|
| Status | v2.01 |
| Date | 2026-10-19 |
| Inputs | [`product-spec.md`](product-spec.md) (v0.59) · [`tech-design.md`](tech-design.md) (v2.11) |

The backlog of open work. `/glance-next` (`scripts/glance-next.mjs`) runs it: it takes the first ⬜ task whose dependencies are ✅. Done tasks are removed at cleanup; their history is the merged PRs, each titled with its task ID.

## Status tracking

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🔄 In progress ([#n](#)) | Work has started. Links the task's PR |
| ✅ Done ([#n](#)) | The task's code is **merged to `main`** |

**Rules**
- A task is PR-sized (about 0.5–2 days), cites the requirement IDs it covers (**Covers**) and has a **Done when** check. Done also means CI green (`biome check → tsc → Vitest → next build`).
- **IDs** are a letter and two digits (`T05`), with a letter per batch of work. Never reuse an ID: letters used so far are B C D F H I L N P Q R S T U V Y.
- **Depends on** lists hard dependencies only, by ID, and only on rows still in this file. A task can start once they are ✅.
- One task = one branch (`feat/<ID>-<slug>`) and one PR titled with the ID (`T05: …`). **Start:** `git fetch origin`, check its dependencies are ✅ on `origin/main`, branch from `origin/main`, open a draft PR; its first commit sets the row to 🔄. **Finish:** bring in the latest `origin/main`; the last commit before merge sets the row to ✅. A closed, unmerged PR resets it to ⬜.
- **Docs move with the code:** a PR that changes behavior, a decision, a schema, an API or the structure updates `product-spec.md` and/or `tech-design.md` in the same PR (bump the version) and fixes any row it makes wrong.
- Remove ✅ rows once nothing open depends on them.

## Tasks

| ID | Status | Task | Depends on | Done when | Covers |
|---|---|---|---|---|---|
| R01 | 🔄 ([#116](https://github.com/vespaiach/glance/pull/116)) | Photo store: `PhotoStore` contract, disk and S3 (`aws4fetch`) adapters, `createPhotoStore` factory with `disk`/`s3`/`r2`, `PHOTO_STORE` config. Upload buffers and runs `sharp` in memory; upload, file, delete and the photo-file job go through the store | — | The contract suite passes on disk and on S3 with a fake `fetch`; the R2 config reaches the R2 endpoint; `DATA_DIR` is required only for `disk`; photo services and jobs no longer import `node:fs` | D12, D17, tech§6.3, tech§6.5 |

## External dependency

| ID | Status | Item | Blocks | Fallback |
|---|---|---|---|---|
| D04 | ⬜ | Season videos `videos/{spring,summer,fall,winter}.mp4`: source, license, size budget (spec §1.3) | The AMB-09 video | Ambient shows its AMB-06 background; the files are added to `public/videos/` when they exist |
