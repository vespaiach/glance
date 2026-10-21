import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Tag } from "@/domain/schemas";
import type { StoredTag } from "../db";
import { isLive, putQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export interface TagsRepo {
  add(tag: Tag): Promise<void>;
}

export function createTagsRepo(store: RepoStore): TagsRepo {
  return {
    add: (tag) => putQueued<Tag>(store, "tags", tag.id, () => tag),
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
