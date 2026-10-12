import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { Note } from "@/domain/schemas";
import { deleteNote, putNote } from "../services/notes";
import { putSettings } from "../services/settings";
import { MARIA, OMAR, START, serviceHarnessPerTest } from "../services/testServices";
import { expireNotes } from "./notes";

const harness = serviceHarnessPerTest();

const DAY_MS = 24 * 60 * 60 * 1000;

function note(id: number, ageMs: number): Note {
  return {
    id: `0192f3a0-3333-7000-8000-00000000000${id}`,
    text: `Note ${id}`,
    author: "Maria",
    createdAt: new Date(START.getTime() - ageMs).toISOString(),
    tone: 1,
    rotation: -2,
  };
}

function liveNoteIds(accountId: string): string[] {
  const rows = harness
    .deps()
    .db.prepare("SELECT id FROM notes WHERE account_id = ? AND deleted_at IS NULL ORDER BY id")
    .all(accountId) as { id: string }[];

  return rows.map((row) => row.id);
}

function noteRow(id: string) {
  return harness
    .deps()
    .db.prepare("SELECT text, deleted_at, updated_at, version FROM notes WHERE id = ?")
    .get(id);
}

describe("expireNotes", () => {
  it("NOTE-08 soft-deletes notes older than the default week and keeps younger ones", () => {
    putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    putNote(harness.deps(), MARIA, note(2, 6 * DAY_MS));

    expireNotes(harness.deps());

    expect(liveNoteIds(MARIA)).toEqual([note(2, 0).id]);
  });

  it("NOTE-08 follows the account's one-day expiry", () => {
    putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: "1d" });
    putNote(harness.deps(), MARIA, note(1, 25 * 60 * 60 * 1000));
    putNote(harness.deps(), MARIA, note(2, 23 * 60 * 60 * 1000));

    expireNotes(harness.deps());

    expect(liveNoteIds(MARIA)).toEqual([note(2, 0).id]);
  });

  it("NOTE-08 never expires notes when the account turned expiry off", () => {
    putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: null });
    putNote(harness.deps(), MARIA, note(1, 90 * DAY_MS));

    expireNotes(harness.deps());

    expect(liveNoteIds(MARIA)).toEqual([note(1, 0).id]);
  });

  it("SYNC-03 keeps the expired note as a tombstone stamped with now and the next version", () => {
    putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    harness.advance(60_000);

    expireNotes(harness.deps());

    expect(noteRow(note(1, 0).id)).toEqual({
      text: "Note 1",
      deleted_at: "2026-10-09T14:01:00.000Z",
      updated_at: "2026-10-09T14:01:00.000Z",
      version: 2,
    });
  });

  it("tech§5 answers each account's newest version so its displays can be told", () => {
    putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    putNote(harness.deps(), MARIA, note(2, 9 * DAY_MS));
    putNote(harness.deps(), OMAR, note(3, 8 * DAY_MS));

    expect(expireNotes(harness.deps())).toEqual([
      { accountId: MARIA, version: 5 },
      { accountId: OMAR, version: 6 },
    ]);
  });

  it("tech§5 leaves a note that is already deleted untouched", () => {
    putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    deleteNote(harness.deps(), MARIA, note(1, 0).id);

    expect(expireNotes(harness.deps())).toEqual([]);
    expect(harness.globalVersion()).toBe(2);
  });

  it("tech§5 applies each account's expiry only to that account's notes", () => {
    putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: null });
    putSettings(harness.deps(), OMAR, OMAR, { ...DEFAULT_SETTINGS, noteExpiry: "1d" });
    putNote(harness.deps(), MARIA, note(1, 2 * DAY_MS));
    putNote(harness.deps(), OMAR, note(2, 2 * DAY_MS));

    expireNotes(harness.deps());

    expect(liveNoteIds(MARIA)).toEqual([note(1, 0).id]);
    expect(liveNoteIds(OMAR)).toEqual([]);
  });
});
