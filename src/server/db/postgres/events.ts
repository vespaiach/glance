import "server-only";
import type { Owned, Repos, StoredEvent } from "../database";
import { optional, type ServerColumns, serverFields } from "./rows";
import type { Sql } from "./sql";

type EventRow = ServerColumns & {
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
  notify: boolean;
};

export function eventsRepo(sql: Sql): Repos["events"] {
  return {
    find: async (id) => {
      const row = await sql.one<EventRow>("SELECT * FROM events WHERE id = $1", [id]);

      return row && owned(row);
    },
    save: (accountId, event) => saveEvent(sql, accountId, event),
    changedSince: async (accountId, version) => {
      const rows = await sql.all<EventRow>(
        "SELECT * FROM events WHERE account_id = $1 AND version > $2 ORDER BY version",
        [accountId, version],
      );

      return rows.map(toEvent);
    },
    liveStarting: async (after, until) => {
      const rows = await sql.all<EventRow>(
        "SELECT * FROM events WHERE deleted_at IS NULL AND start_at > $1 AND start_at <= $2 ORDER BY start_at",
        [after, until],
      );

      return rows.map(owned);
    },
  };
}

function owned(row: EventRow): Owned<StoredEvent> {
  return { accountId: row.account_id, value: toEvent(row) };
}

function toEvent(row: EventRow): StoredEvent {
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
    notify: row.notify,
    ...serverFields(row),
  };
}

async function saveEvent(sql: Sql, accountId: string, event: StoredEvent): Promise<void> {
  await sql.run(
    `INSERT INTO events (id, account_id, title, start_at, end_at, location, all_day, everyone,
       tag_ids, notes, notify, updated_at, deleted_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, start_at = excluded.start_at,
       end_at = excluded.end_at, location = excluded.location, all_day = excluded.all_day,
       everyone = excluded.everyone, tag_ids = excluded.tag_ids, notes = excluded.notes,
       notify = excluded.notify, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at, version = excluded.version`,
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
      event.notify !== false,
      event.updatedAt,
      event.deletedAt ?? null,
      event.version,
    ],
  );
}
