import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { CalendarEvent, Synced } from "@/domain/schemas";
import type { Database } from "../db";
import type { ServiceDeps } from "./deps";
import { stamp } from "./rows";

export type SyncedEvent = Synced<CalendarEvent>;

export function putEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  event: CalendarEvent,
): Promise<Result<SyncedEvent, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedEvent, "not-found">> => {
    const existing = await tx.events.find(event.id);

    if (existing && existing.accountId !== accountId) return err("not-found");

    if (existing?.value.deletedAt) return ok(existing.value);

    const kept = await withLiveTags(tx, accountId, event);

    const stamped = await stamp(tx, now());

    const saved = { ...kept, ...stamped };

    await tx.events.save(accountId, saved);

    return ok(saved);
  });
}

export function deleteEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedEvent, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedEvent, "not-found">> => {
    const existing = await tx.events.find(id);

    if (existing?.accountId !== accountId) return err("not-found");

    if (existing.value.deletedAt) return ok(existing.value);

    const { updatedAt, version } = await stamp(tx, now());

    const deleted = { ...existing.value, deletedAt: updatedAt, updatedAt, version };

    await tx.events.save(accountId, deleted);

    return ok(deleted);
  });
}

async function withLiveTags(
  db: Database,
  accountId: string,
  event: CalendarEvent,
): Promise<CalendarEvent> {
  if (event.everyone) return event;

  const live = await db.tags.liveIds(accountId, event.tagIds);

  return { ...event, tagIds: event.tagIds.filter((id) => live.has(id)) };
}
