import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { CalendarEvent, Synced, Tone } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import {
  lockVersions,
  optional,
  type ServerColumns,
  type Stamp,
  serverFields,
  stamp,
  toneFromColumn,
} from "./rows";

export type SyncedEvent = Synced<CalendarEvent>;

export type EventRow = ServerColumns & {
  id: string;
  account_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  tone: string;
  all_day: boolean;
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

    const stamped = await stamp(tx, now());

    await writeEvent(tx, accountId, event, stamped);

    return ok({ ...event, ...stamped });
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
    tone: toneFromColumn<Tone>(row.tone),
    ...(row.all_day ? { allDay: true } : {}),
    ...serverFields(row),
  };
}

function eventRow(db: Db, id: string): Promise<EventRow | undefined> {
  return db.one<EventRow>("SELECT * FROM events WHERE id = $1", [id]);
}

async function writeEvent(
  db: Db,
  accountId: string,
  event: CalendarEvent,
  { updatedAt, version }: Stamp,
): Promise<void> {
  await db.run(
    `INSERT INTO events (id, account_id, title, start_at, end_at, location, tone, all_day, updated_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, start_at = excluded.start_at,
       end_at = excluded.end_at, location = excluded.location, tone = excluded.tone,
       all_day = excluded.all_day, updated_at = excluded.updated_at, version = excluded.version`,
    [
      event.id,
      accountId,
      event.title,
      event.startAt,
      event.endAt ?? null,
      event.location ?? null,
      String(event.tone),
      event.allDay === true,
      updatedAt,
      version,
    ],
  );
}
