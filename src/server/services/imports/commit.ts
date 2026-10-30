import "server-only";
import { uuidv7 } from "@/domain/id";
import {
  attendeeTags,
  type ImportedEvent,
  type ImportResult,
  type ImportWho,
  type LastImport,
} from "@/domain/imports";
import { err, ok, type Result } from "@/domain/result";
import type { Tag } from "@/domain/schemas";
import { EVERYONE, type EventWho, whoValue } from "@/domain/tags";
import type { Database, ImportRecord, StoredEvent } from "../../db";
import type { ServiceDeps } from "../deps";
import { stamp } from "../rows";
import { liveTags, markedEvents } from "./stage";

export type CommitError = "not-found" | "not-staged" | "unknown-tag";

export type UndoError = "not-found" | "not-done" | "too-late";

export type Versioned<T> = T & { version: number };

export const UNDO_MS = 24 * 60 * 60 * 1000;

export function commitImport(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
  who: ImportWho,
): Promise<Result<Versioned<ImportResult>, CommitError>> {
  return db.tx(async (tx): Promise<Result<Versioned<ImportResult>, CommitError>> => {
    const staged = await tx.imports.find(id);

    if (staged?.accountId !== accountId) return err("not-found");

    if (staged.status !== "staged") return err("not-staged");

    if (!(await isLiveWho(tx, accountId, who))) return err("unknown-tag");

    const fresh = (await markedEvents(tx, staged)).filter((event) => !event.duplicate);

    const tags = await liveTags(tx, accountId);

    const importedAt = now().toISOString();

    if (!(await tx.imports.markDone(id, { who, count: fresh.length, importedAt }))) {
      return err("not-staged");
    }

    const plans = fresh.map((event) => ({ event, matched: attendeeTags(event.attendees, tags) }));

    for (const { event, matched } of plans)
      await tx.events.save(
        accountId,
        await imported(tx, now(), event, id, whoOf(matched, tags, who)),
      );

    return ok({
      count: fresh.length,
      range: staged.range,
      who,
      matched: plans.filter((plan) => plan.matched.length > 0).length,
      version: await tx.versions.current(),
    });
  });
}

export function undoImport(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<{ version: number }, UndoError>> {
  return db.tx(async (tx): Promise<Result<{ version: number }, UndoError>> => {
    const done = await tx.imports.find(id);

    if (done?.accountId !== accountId) return err("not-found");

    if (done.status !== "done") return err("not-done");

    if (now().getTime() >= undoUntil(done)) return err("too-late");

    await tx.imports.markUndone(id);

    for (const event of await tx.events.liveFromImport(accountId, id)) {
      const { updatedAt, version } = await stamp(tx, now());

      await tx.events.save(accountId, { ...event, deletedAt: updatedAt, updatedAt, version });
    }

    return ok({ version: await tx.versions.current() });
  });
}

export async function lastImport(
  { db }: ServiceDeps,
  accountId: string,
): Promise<Result<LastImport, "not-found">> {
  const last = await db.imports.newestImported(accountId);

  if (last?.status !== "done") return err("not-found");

  return ok({
    id: last.id,
    importedAt: last.importedAt as string,
    count: last.count as number,
    who: last.who as ImportWho,
    undoUntil: new Date(undoUntil(last)).toISOString(),
  });
}

async function isLiveWho(db: Database, accountId: string, who: ImportWho): Promise<boolean> {
  if (who === "everyone") return true;

  return (await db.tags.liveIds(accountId, [who])).has(who);
}

async function imported(
  db: Database,
  now: Date,
  { duplicate: _, attendees: _attendees, ...event }: ImportedEvent & { duplicate: boolean },
  importId: string,
  who: EventWho,
): Promise<StoredEvent> {
  return {
    ...event,
    id: uuidv7(now),
    everyone: who.everyone,
    tagIds: [...who.tagIds],
    notify: true,
    importId,
    ...(await stamp(db, now)),
  };
}

function whoOf(matched: readonly string[], tags: readonly Tag[], picked: ImportWho): EventWho {
  if (matched.length > 0)
    return whoValue(
      matched,
      tags.map((tag) => tag.id),
    );

  return picked === "everyone" ? EVERYONE : { everyone: false, tagIds: [picked] };
}

function undoUntil(record: ImportRecord): number {
  return Date.parse(record.importedAt as string) + UNDO_MS;
}
