import type { Note } from "@/domain/schemas";
import { deleteNote, putNote } from "./notes";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const NOTE: Note = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: "2026-10-09T13:00:00.000Z",
  tone: "soft",
  rotation: -1.5,
};

describe("putNote", () => {
  it("SYNC-01 saves a new note stamped with the server time and the next version", () => {
    expect(putNote(harness.deps(), MARIA, NOTE)).toEqual({
      ok: true,
      value: { ...NOTE, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("SYNC-03 replaces the note with the last write to reach the server", () => {
    putNote(harness.deps(), MARIA, NOTE);
    harness.advance(60_000);

    const saved = putNote(harness.deps(), MARIA, { ...NOTE, text: "Milk", tone: 3 });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...NOTE,
        text: "Milk",
        tone: 3,
        updatedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("SYNC-03 delete wins: a put on a deleted note answers the tombstone unchanged", () => {
    putNote(harness.deps(), MARIA, NOTE);
    const tombstone = deleteNote(harness.deps(), MARIA, NOTE.id);

    expect(putNote(harness.deps(), MARIA, { ...NOTE, text: "Back again" })).toEqual(tombstone);
  });

  it("tech§5 refuses to write over another account's note", () => {
    putNote(harness.deps(), MARIA, NOTE);

    expect(putNote(harness.deps(), OMAR, { ...NOTE, text: "Mine now" })).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(harness.globalVersion()).toBe(1);
  });
});

describe("deleteNote", () => {
  it("SYNC-03 keeps a tombstone stamped with the delete time and the next version", () => {
    putNote(harness.deps(), MARIA, NOTE);
    harness.advance(60_000);

    expect(deleteNote(harness.deps(), MARIA, NOTE.id)).toEqual({
      ok: true,
      value: {
        ...NOTE,
        updatedAt: "2026-10-09T14:01:00.000Z",
        deletedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("tech§5 answers not-found for a note the server never had", () => {
    expect(deleteNote(harness.deps(), MARIA, NOTE.id)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("tech§5 refuses to delete another account's note", () => {
    putNote(harness.deps(), MARIA, NOTE);

    expect(deleteNote(harness.deps(), OMAR, NOTE.id)).toEqual({ ok: false, error: "not-found" });
    expect(harness.globalVersion()).toBe(1);
  });
});
