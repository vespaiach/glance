import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import { type Synced, type Tag, TagColorSchema } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import { lockVersions, type ServerColumns, type Stamp, serverFields, stamp } from "./rows";

export type SyncedTag = Synced<Tag>;

export type TagError = "not-found" | "tag-changed" | "name-taken";

export type TagRow = ServerColumns & {
  id: string;
  account_id: string;
  name: string;
  color: Tag["color"];
  created_at: string;
};

export function putTag(
  { db, now }: ServiceDeps,
  accountId: string,
  tag: Tag,
): Promise<Result<SyncedTag, TagError>> {
  return db.tx(async (tx): Promise<Result<SyncedTag, TagError>> => {
    await lockVersions(tx);

    const existing = await tagRow(tx, tag.id);

    if (existing) return sameTag(existing, accountId, tag);

    if (await nameTaken(tx, accountId, tag)) return err("name-taken");

    const stamped = await stamp(tx, now());

    await writeTag(tx, accountId, tag, stamped);

    return ok({ ...tag, ...stamped });
  });
}

export function addFirstTag(
  { db, now }: ServiceDeps,
  accountId: string,
  name: string,
): Promise<SyncedTag | undefined> {
  return db.tx(async (tx): Promise<SyncedTag | undefined> => {
    await lockVersions(tx);

    if (await hasTag(tx, accountId)) return undefined;

    const tag = firstTag(name, now());

    const stamped = await stamp(tx, now());

    await writeTag(tx, accountId, tag, stamped);

    return { ...tag, ...stamped };
  });
}

export function toTag(row: TagRow): SyncedTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    ...serverFields(row),
  };
}

export async function liveTagIds(
  db: Db,
  accountId: string,
  ids: readonly string[],
): Promise<Set<string>> {
  const rows = await db.all<{ id: string }>(
    "SELECT id FROM tags WHERE account_id = $1 AND deleted_at IS NULL AND id = ANY($2)",
    [accountId, ids],
  );

  return new Set(rows.map((row) => row.id));
}

function tagRow(db: Db, id: string): Promise<TagRow | undefined> {
  return db.one<TagRow>("SELECT * FROM tags WHERE id = $1", [id]);
}

function sameTag(row: TagRow, accountId: string, tag: Tag): Result<SyncedTag, TagError> {
  if (row.account_id !== accountId) return err("not-found");

  return row.name === tag.name && row.color === tag.color ? ok(toTag(row)) : err("tag-changed");
}

async function nameTaken(db: Db, accountId: string, tag: Tag): Promise<boolean> {
  const row = await db.one(
    `SELECT 1 FROM tags
     WHERE account_id = $1 AND deleted_at IS NULL AND lower(name) = lower($2)`,
    [accountId, tag.name],
  );

  return row !== undefined;
}

async function hasTag(db: Db, accountId: string): Promise<boolean> {
  const row = await db.one("SELECT 1 FROM tags WHERE account_id = $1", [accountId]);

  return row !== undefined;
}

function firstTag(name: string, now: Date): Tag {
  const [color] = TagColorSchema.options;

  return { id: uuidv7(now), name, color, createdAt: now.toISOString() };
}

async function writeTag(
  db: Db,
  accountId: string,
  tag: Tag,
  { updatedAt, version }: Stamp,
): Promise<void> {
  await db.run(
    `INSERT INTO tags (id, account_id, name, color, created_at, updated_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [tag.id, accountId, tag.name, tag.color, tag.createdAt, updatedAt, version],
  );
}
