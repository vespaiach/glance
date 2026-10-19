import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { removalImpact, withoutMember } from "@/domain/members";
import type { CalendarEvent, Member } from "@/domain/schemas";
import type { StoredEvent, StoredMember } from "../db";
import { isLive, type NewEntry, putQueued, putRow, queued, removeRow } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export interface MembersRepo {
  put(member: Member): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createMembersRepo(store: RepoStore): MembersRepo {
  return {
    put: (member) => putQueued<Member>(store, "members", member.id, () => member),
    remove: (id) => queued(store, ["members", "events"], () => removeMember(store, id)),
  };
}

export function useMembersRepo(): MembersRepo {
  const store = useRepoStore();

  return useMemo(() => createMembersRepo(store), [store]);
}

export function useMembers(): StoredMember[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => db.members.orderBy("createdAt").filter(isLive).toArray(), [db]);
}

export function useMemberPlans(): StoredEvent[] | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(
    () => db.events.filter((event) => isLive(event) && !event.everyone).toArray(),
    [db],
  );
}

async function removeMember(store: RepoStore, id: string): Promise<(NewEntry | undefined)[]> {
  const member = await store.db.members.get(id);

  if (member === undefined || !isLive(member)) return [];

  const events = await store.db.events.filter(isLive).toArray();

  const { solo, shared } = removalImpact(id, events);

  const entries = [await removeRow(store, "members", id)];

  for (const event of solo) entries.push(await removeRow(store, "events", event.id));

  for (const event of shared) entries.push(await stripMember(store, event, id));

  return entries;
}

function stripMember(store: RepoStore, event: CalendarEvent, id: string): Promise<NewEntry> {
  return putRow<CalendarEvent>(store, "events", event.id, () => withoutMember(event, id));
}
