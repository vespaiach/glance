import "server-only";
import { uuidv7 } from "@/domain/id";
import { err, ok, type Result } from "@/domain/result";
import { type Synced, type Tag, TagColorSchema } from "@/domain/schemas";
import type { Owned } from "../db";
import type { ServiceDeps } from "./deps";
import { stamp } from "./rows";

export type SyncedTag = Synced<Tag>;

export type TagError = "not-found" | "tag-changed";

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

function sameTag(
  { accountId: owner, value }: Owned<SyncedTag>,
  accountId: string,
  tag: Tag,
): Result<SyncedTag, TagError> {
  if (owner !== accountId) return err("not-found");

  return value.name === tag.name && value.color === tag.color ? ok(value) : err("tag-changed");
}

function firstTag(name: string, now: Date): Tag {
  const [color] = TagColorSchema.options;

  return { id: uuidv7(now), name, color, createdAt: now.toISOString() };
}
