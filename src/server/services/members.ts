import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import { type Member, MemberColorSchema, type Synced } from "@/domain/schemas";
import type { Db } from "../db/db";
import type { ServiceDeps } from "./deps";
import { lockVersions, type ServerColumns, type Stamp, serverFields, stamp } from "./rows";

export type SyncedMember = Synced<Member>;

export type MemberError = "not-found" | "name-taken";

export type MemberRow = ServerColumns & {
  id: string;
  account_id: string;
  name: string;
  color: Member["color"];
  created_at: string;
};

export function putMember(
  { db, now }: ServiceDeps,
  accountId: string,
  member: Member,
): Promise<Result<SyncedMember, MemberError>> {
  return db.tx(async (tx): Promise<Result<SyncedMember, MemberError>> => {
    await lockVersions(tx);

    const existing = await memberRow(tx, member.id);

    if (existing && existing.account_id !== accountId) return err("not-found");

    if (existing?.deleted_at) return ok(toMember(existing));

    if (await nameTaken(tx, accountId, member)) return err("name-taken");

    const stamped = await stamp(tx, now());

    await writeMember(tx, accountId, member, stamped);

    return ok({ ...member, ...stamped });
  });
}

export function deleteMember(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedMember, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedMember, "not-found">> => {
    await lockVersions(tx);

    const existing = await memberRow(tx, id);

    if (existing?.account_id !== accountId) return err("not-found");

    if (existing.deleted_at) return ok(toMember(existing));

    const { updatedAt, version } = await stamp(tx, now());

    await tx.run(
      "UPDATE members SET deleted_at = $1, updated_at = $1, version = $2 WHERE id = $3",
      [updatedAt, version, id],
    );

    return ok(toMember({ ...existing, deleted_at: updatedAt, updated_at: updatedAt, version }));
  });
}

export function addFirstMember(
  { db, now }: ServiceDeps,
  accountId: string,
  name: string,
): Promise<SyncedMember | undefined> {
  return db.tx(async (tx): Promise<SyncedMember | undefined> => {
    await lockVersions(tx);

    if (await hasMember(tx, accountId)) return undefined;

    const member = firstMember(name, now());

    const stamped = await stamp(tx, now());

    await writeMember(tx, accountId, member, stamped);

    return { ...member, ...stamped };
  });
}

export function toMember(row: MemberRow): SyncedMember {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    ...serverFields(row),
  };
}

export async function liveMemberIds(
  db: Db,
  accountId: string,
  ids: readonly string[],
): Promise<Set<string>> {
  const rows = await db.all<{ id: string }>(
    "SELECT id FROM members WHERE account_id = $1 AND deleted_at IS NULL AND id = ANY($2)",
    [accountId, ids],
  );

  return new Set(rows.map((row) => row.id));
}

function memberRow(db: Db, id: string): Promise<MemberRow | undefined> {
  return db.one<MemberRow>("SELECT * FROM members WHERE id = $1", [id]);
}

async function nameTaken(db: Db, accountId: string, member: Member): Promise<boolean> {
  const row = await db.one(
    `SELECT 1 FROM members
     WHERE account_id = $1 AND deleted_at IS NULL AND lower(name) = lower($2) AND id <> $3`,
    [accountId, member.name, member.id],
  );

  return row !== undefined;
}

async function hasMember(db: Db, accountId: string): Promise<boolean> {
  const row = await db.one("SELECT 1 FROM members WHERE account_id = $1", [accountId]);

  return row !== undefined;
}

function firstMember(name: string, now: Date): Member {
  const [color] = MemberColorSchema.options;

  return { id: uuidv7(now), name, color, createdAt: now.toISOString() };
}

async function writeMember(
  db: Db,
  accountId: string,
  member: Member,
  { updatedAt, version }: Stamp,
): Promise<void> {
  await db.run(
    `INSERT INTO members (id, account_id, name, color, created_at, updated_at, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, color = excluded.color,
       created_at = excluded.created_at, updated_at = excluded.updated_at,
       version = excluded.version`,
    [member.id, accountId, member.name, member.color, member.createdAt, updatedAt, version],
  );
}
