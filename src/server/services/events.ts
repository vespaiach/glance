import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { CalendarEvent, Synced } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import { lockVersions, optional, type ServerColumns, serverFields, stamp } from "./rows";
import { liveTagIds } from "./tags";

export type SyncedEvent = Synced<CalendarEvent>;

export type EventRow = ServerColumns & {
  id: string;
  account_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  all_day: boolean;
  everyone: boolean;
  tag_ids: string[];
  notes: string | null;
};

export function putEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  event: CalendarEvent,
): Promise<Result<SyncedEvent, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedEvent, "not-found">> => {
    await lockVersions(tx);

    const existing = await eventRow(tx, event.id);

    if (existing && existing.account_id !== accountId) return err("not-found");

    if (existing?.deleted_at) return ok(toEvent(existing));

    const kept = await withLiveTags(tx, accountId, event);

    const stamped = await stamp(tx, now());

    const saved = { ...kept, ...stamped };

    await writeEvent(tx, accountId, saved);

    return ok(saved);
  });
}

export function deleteEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedEvent, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedEvent, "not-found">> => {
    await lockVersions(tx);

    const existing = await eventRow(tx, id);

    if (existing?.account_id !== accountId) return err("not-found");

    if (existing.deleted_at) return ok(toEvent(existing));

    const { updatedAt, version } = await stamp(tx, now());

    await tx.run("UPDATE events SET deleted_at = $1, updated_at = $1, version = $2 WHERE id = $3", [
      updatedAt,
      version,
      id,
    ]);

    return ok(toEvent({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  });
}

export function toEvent(row: EventRow): SyncedEvent {
  return {
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    ...optional("endAt", row.end_at),
    ...optional("location", row.location),
    ...(row.all_day ? { allDay: true } : {}),
    everyone: row.everyone,
    tagIds: row.tag_ids,
    ...optional("notes", row.notes),
    ...serverFields(row),
  };
}

function eventRow(db: Db, id: string): Promise<EventRow | undefined> {
  return db.one<EventRow>("SELECT * FROM events WHERE id = $1", [id]);
}

async function withLiveTags(
  db: Db,
  accountId: string,
  event: CalendarEvent,
): Promise<CalendarEvent> {
  if (event.everyone) return event;

  const live = await liveTagIds(db, accountId, event.tagIds);

  return { ...event, tagIds: event.tagIds.filter((id) => live.has(id)) };
}

async function writeEvent(db: Db, accountId: string, event: SyncedEvent): Promise<void> {
  await db.run(
    `INSERT INTO events (id, account_id, title, start_at, end_at, location, all_day, everyone,
       tag_ids, notes, updated_at, deleted_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, start_at = excluded.start_at,
       end_at = excluded.end_at, location = excluded.location, all_day = excluded.all_day,
       everyone = excluded.everyone, tag_ids = excluded.tag_ids, notes = excluded.notes,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
       version = excluded.version`,
    [
      event.id,
      accountId,
      event.title,
      event.startAt,
      event.endAt ?? null,
      event.location ?? null,
      event.allDay === true,
      event.everyone,
      event.tagIds,
      event.notes ?? null,
      event.updatedAt,
      event.deletedAt ?? null,
      event.version,
    ],
  );
}
