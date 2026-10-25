import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import { type Synced, type Tag, TagColorSchema } from "@/domain/schemas";
import type { Database, Owned, StoredEvent } from "../db";
import type { ServiceDeps } from "./deps";
import { type Stamp, stamp } from "./rows";

export type SyncedTag = Synced<Tag>;

export type TagError = "not-found" | "tag-changed";

export type RemoveTagError = "not-found" | "last-tag";

export function putTag(
  { db, now }: ServiceDeps,
  accountId: string,
  tag: Tag,
): Promise<Result<SyncedTag, TagError>> {
  return db.tx(async (tx): Promise<Result<SyncedTag, TagError>> => {
    const existing = await tx.tags.find(tag.id);

    if (existing) return sameTag(existing, accountId, tag);

    const named = await tx.tags.liveByName(accountId, tag.name);

    if (named) return ok(named);

    const saved = { ...tag, ...(await stamp(tx, now())) };

    await tx.tags.save(accountId, saved);

    return ok(saved);
  });
}

export function addFirstTag(
  { db, now }: ServiceDeps,
  accountId: string,
  name: string,
): Promise<SyncedTag | undefined> {
  return db.tx(async (tx): Promise<SyncedTag | undefined> => {
    if (await tx.tags.hasAny(accountId)) return undefined;

    const saved = { ...firstTag(name, now()), ...(await stamp(tx, now())) };

    await tx.tags.save(accountId, saved);

    return saved;
  });
}

export function removeTag(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedTag, RemoveTagError>> {
  return db.tx(async (tx): Promise<Result<SyncedTag, RemoveTagError>> => {
    const existing = await tx.tags.find(id);

    if (existing?.accountId !== accountId) return err("not-found");

    if (existing.value.deletedAt) return ok(existing.value);

    if ((await tx.tags.liveCount(accountId)) <= 1) return err("last-tag");

    await cascade(tx, accountId, id, now());

    const { updatedAt, version } = await stamp(tx, now());

    const removed = { ...existing.value, deletedAt: updatedAt, updatedAt, version };

    await tx.tags.save(accountId, removed);

    return ok(removed);
  });
}

function sameTag(
  { accountId: owner, value }: Owned<SyncedTag>,
  accountId: string,
  tag: Tag,
): Result<SyncedTag, TagError> {
  if (owner !== accountId) return err("not-found");

  return value.name === tag.name && value.color === tag.color ? ok(value) : err("tag-changed");
}

async function cascade(tx: Database, accountId: string, tagId: string, now: Date): Promise<void> {
  const events = await tx.events.liveWithTag(accountId, tagId);

  for (const event of events) {
    const changed = withoutTag(event, tagId, await stamp(tx, now));

    await tx.events.save(accountId, changed);
  }
}

function withoutTag(event: StoredEvent, tagId: string, { updatedAt, version }: Stamp): StoredEvent {
  const tagIds = event.tagIds.filter((one) => one !== tagId);

  if (tagIds.length === 0) return { ...event, deletedAt: updatedAt, updatedAt, version };

  return { ...event, tagIds, updatedAt, version };
}

function firstTag(name: string, now: Date): Tag {
  const [color] = TagColorSchema.options;

  return { id: uuidv7(now), name, color, createdAt: now.toISOString() };
}
