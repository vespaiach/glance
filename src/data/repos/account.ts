import { useLiveQuery } from "dexie-react-hooks";
import type { GlanceDb } from "../db";
import { isLive } from "./outbox";
import { useRepoStore } from "./store";

export type AccountCounts = { events: number; notes: number; photos: number; tags: number };

export function useAccountCounts(): AccountCounts | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(() => readCounts(db), [db]);
}

async function readCounts(db: GlanceDb): Promise<AccountCounts> {
  const [events, notes, photos, tags] = await Promise.all(
    [db.events, db.notes, db.photos, db.tags].map((table) => table.filter(isLive).count()),
  );

  return { events: events ?? 0, notes: notes ?? 0, photos: photos ?? 0, tags: tags ?? 0 };
}
