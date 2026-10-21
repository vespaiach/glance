import "server-only";
import { err, ok, type Result } from "@/domain/result";
import type { Note, Synced } from "@/domain/schemas";
import type { ServiceDeps } from "./deps";
import { stamp } from "./rows";

export type SyncedNote = Synced<Note>;

export function putNote(
  { db, now }: ServiceDeps,
  accountId: string,
  note: Note,
): Promise<Result<SyncedNote, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedNote, "not-found">> => {
    const existing = await tx.notes.find(note.id);

    if (existing && existing.accountId !== accountId) return err("not-found");

    if (existing?.value.deletedAt) return ok(existing.value);

    const saved = { ...note, ...(await stamp(tx, now())) };

    await tx.notes.save(accountId, saved);

    return ok(saved);
  });
}

export function deleteNote(
  { db, now }: ServiceDeps,
  accountId: string,
  id: string,
): Promise<Result<SyncedNote, "not-found">> {
  return db.tx(async (tx): Promise<Result<SyncedNote, "not-found">> => {
    const existing = await tx.notes.find(id);

    if (existing?.accountId !== accountId) return err("not-found");

    if (existing.value.deletedAt) return ok(existing.value);

    const { updatedAt, version } = await stamp(tx, now());

    const deleted = { ...existing.value, deletedAt: updatedAt, updatedAt, version };

    await tx.notes.save(accountId, deleted);

    return ok(deleted);
  });
}
