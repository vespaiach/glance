import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { noteExpired, noteWaitingToPost } from "@/domain/notes";
import type { AccountSettings, Note } from "@/domain/schemas";
import type { GlanceDb, StoredNote } from "../db";
import { isLive, pendingIds, putQueued, removeQueued } from "./outbox";
import { type RepoStore, useRepoStore } from "./store";

export type ShownNote = StoredNote & { waiting: boolean };

export interface NotesRepo {
  put(note: Note): Promise<void>;
  remove(id: string): Promise<void>;
}

type NotesRead = {
  notes: StoredNote[];
  pending: Set<string>;
  expiry: AccountSettings["noteExpiry"];
};

export function createNotesRepo(store: RepoStore): NotesRepo {
  return {
    put: (note) => putQueued<Note>(store, "notes", note.id, () => note),
    remove: (id) => removeQueued(store, "notes", id),
  };
}

export function useNotesRepo(): NotesRepo {
  const store = useRepoStore();

  return useMemo(() => createNotesRepo(store), [store]);
}

export function useNote(id: string): ShownNote | null | undefined {
  const { db } = useRepoStore();

  return useLiveQuery(async () => {
    const row = await db.notes.get(id);

    if (!row || !isLive(row)) return null;

    const pending = await pendingIds(db, "notes");

    return {
      ...row,
      waiting: noteWaitingToPost({ pending: pending.has(id), version: row.version }),
    };
  }, [db, id]);
}

export function useNotes(now: Date): ShownNote[] | undefined {
  const { db, accountId } = useRepoStore();

  const read = useLiveQuery(() => readNotes(db, accountId), [db, accountId]);

  return useMemo(() => read && shownNotes(read, now), [read, now]);
}

async function readNotes(db: GlanceDb, accountId: string): Promise<NotesRead> {
  const notes = await db.notes.orderBy("createdAt").reverse().filter(isLive).toArray();

  const pending = await pendingIds(db, "notes");

  const settings = await db.settings.get(accountId);

  return { notes, pending, expiry: (settings ?? DEFAULT_SETTINGS).noteExpiry };
}

function shownNotes({ notes, pending, expiry }: NotesRead, now: Date): ShownNote[] {
  return notes
    .filter((note) => !noteExpired(note, expiry, now))
    .map((note) => ({
      ...note,
      waiting: noteWaitingToPost({ pending: pending.has(note.id), version: note.version }),
    }));
}
