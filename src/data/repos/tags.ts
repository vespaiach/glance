import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Tag } from "@/domain/schemas";
import { memberRemoval } from "@/domain/tags";
import type { StoredEvent, StoredTag } from "../db";
import { isLive, putQueued, queued, removeRow } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export interface TagsRepo {
  add(tag: Tag): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createTagsRepo(store: RepoStore): TagsRepo {
  return {
    add: (tag) => putQueued<Tag>(store, "tags", tag.id, () => tag),
    remove: (id) => queued(store, ["tags", "events"], () => removeTag(store, id)),
  };
}

export function useTagsRepo(): TagsRepo {
  const store = useRepoStore();

  return useMemo(() => createTagsRepo(store), [store]);
}

export function useTags(): StoredTag[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => db.tags.orderBy("createdAt").filter(isLive).toArray(), [db]);
}

async function removeTag(store: RepoStore, id: string) {
  const entry = await removeRow(store, "tags", id);

  if (entry === undefined) return [];

  const events = await store.db.events.toArray();

  await store.db.events.bulkPut(withoutTag(events, id, store.now().toISOString()));

  return [entry];
}

function withoutTag(events: StoredEvent[], tagId: string, deletedAt: string): StoredEvent[] {
  const { deleted, stripped } = memberRemoval(events, tagId);

  return events.flatMap((event) => {
    if (deleted.includes(event.id)) return [{ ...event, deletedAt }];

    if (stripped.includes(event.id))
      return [{ ...event, tagIds: event.tagIds.filter((one) => one !== tagId) }];

    return [];
  });
}
