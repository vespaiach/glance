import "server-only";
import { uuidv7 } from "@/domain/id";
import {
  type ImportedEvent,
  type ImportReview,
  type Marked,
  markDuplicates,
} from "@/domain/imports";
import { err, ok, type Result } from "@/domain/result";
import type { Database, StagedImport } from "../../db";
import type { ServiceDeps } from "../deps";
import { accountTimeZone } from "../rows";
import { type IcsError, parseIcs } from "./parse";

export type IcsUpload = { fileName: string; text: string; size: number; forDisplay?: string };

export type StageError = IcsError | "not-found";

export const STAGED_MS = 60 * 60 * 1000;

export async function stageImport(
  { db, now }: ServiceDeps,
  accountId: string,
  displayId: string,
  upload: IcsUpload,
): Promise<Result<ImportReview, StageError>> {
  const forDisplayId = upload.forDisplay ?? displayId;

  if (!(await isAccountDisplay(db, accountId, forDisplayId))) return err("not-found");

  const parsed = parseIcs(upload.text, now(), await accountTimeZone(db, accountId));

  if (!parsed.ok) return parsed;

  const staged: StagedImport = {
    id: uuidv7(now()),
    accountId,
    forDisplayId,
    fileName: upload.fileName,
    bytes: upload.size,
    ...parsed.value,
    createdAt: now().toISOString(),
  };

  await db.imports.insert(staged);

  return ok(await reviewOf(db, staged));
}

export async function stagedImport(
  { db, now }: ServiceDeps,
  accountId: string,
  displayId: string,
): Promise<Result<ImportReview, "not-found">> {
  const after = new Date(now().getTime() - STAGED_MS).toISOString();

  const staged = await db.imports.newestStaged(accountId, displayId, after);

  if (!staged) return err("not-found");

  return ok(await reviewOf(db, staged));
}

export async function markedEvents(
  db: Database,
  staged: StagedImport,
): Promise<Marked<ImportedEvent>[]> {
  const calendar = (await db.events.changedSince(staged.accountId, 0)).filter((e) => !e.deletedAt);

  const tz = await accountTimeZone(db, staged.accountId);

  return markDuplicates(staged.events, calendar, tz);
}

async function isAccountDisplay(db: Database, accountId: string, displayId: string) {
  const displays = await db.displays.forAccount(accountId);

  return displays.some((display) => display.id === displayId);
}

async function reviewOf(db: Database, staged: StagedImport): Promise<ImportReview> {
  const marked = await markedEvents(db, staged);

  const events = marked.map(({ title, startAt, endAt, allDay, repeat, duplicate }) => ({
    title,
    startAt,
    ...(endAt && { endAt }),
    ...(allDay && { allDay }),
    ...(repeat && { repeat }),
    duplicate,
  }));

  const duplicates = events.filter((event) => event.duplicate).length;

  return {
    id: staged.id,
    fileName: staged.fileName,
    size: staged.bytes,
    range: staged.range,
    events,
    newCount: events.length - duplicates,
    duplicates,
  };
}
