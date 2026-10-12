import "server-only";
import type Database from "better-sqlite3";
import { err, ok, type Result } from "@/domain/result";
import type { CalendarEvent, Synced, Tone } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import {
  optional,
  type ServerColumns,
  type Stamp,
  serverFields,
  stamp,
  toneFromColumn,
} from "./rows";

export type SyncedEvent = Synced<CalendarEvent>;

type EventRow = ServerColumns & {
  id: string;
  account_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  tone: string;
};

export function putEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  event: CalendarEvent,
): Result<SyncedEvent, "not-found"> {
  return db.transaction((): Result<SyncedEvent, "not-found"> => {
    const existing = eventRow(db, event.id);

    if (existing && existing.account_id !== accountId) return err("not-found");

    if (existing?.deleted_at) return ok(toEvent(existing));

    const stamped = stamp(db, now());

    writeEvent(db, accountId, event, stamped);

    return ok({ ...event, ...stamped });
  })();
}

export function deleteEvent(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Result<SyncedEvent, "not-found"> {
  return db.transaction((): Result<SyncedEvent, "not-found"> => {
    const existing = eventRow(db, id);

    if (existing?.account_id !== accountId) return err("not-found");

    if (existing.deleted_at) return ok(toEvent(existing));

    const { updatedAt, version } = stamp(db, now());

    db.prepare("UPDATE events SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?").run(
      updatedAt,
      updatedAt,
      version,
      id,
    );

    return ok(toEvent({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  })();
}

function eventRow(db: Database.Database, id: string): EventRow | undefined {
  return db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
}

function writeEvent(
  db: Database.Database,
  accountId: string,
  event: CalendarEvent,
  { updatedAt, version }: Stamp,
): void {
  db.prepare(
    `INSERT INTO events (id, account_id, title, start_at, end_at, location, tone, updated_at, version)
     VALUES (@id, @accountId, @title, @startAt, @endAt, @location, @tone, @updatedAt, @version)
     ON CONFLICT (id) DO UPDATE SET title = @title, start_at = @startAt, end_at = @endAt,
       location = @location, tone = @tone, updated_at = @updatedAt, version = @version`,
  ).run({
    id: event.id,
    accountId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt ?? null,
    location: event.location ?? null,
    tone: String(event.tone),
    updatedAt,
    version,
  });
}

function toEvent(row: EventRow): SyncedEvent {
  return {
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    ...optional("endAt", row.end_at),
    ...optional("location", row.location),
    tone: toneFromColumn<Tone>(row.tone),
    ...serverFields(row),
  };
}
