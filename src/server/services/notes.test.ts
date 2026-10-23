import type { Note } from "@/domain/schemas";
import { deleteNote, putNote } from "./notes";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const NOTE: Note = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: "2026-10-09T13:00:00.000Z",
  rotation: -1.5,
};

describe("putNote", () => {
  it("SYNC-01 saves a new note stamped with the server time and the next version", async () => {
    expect(await putNote(harness.deps(), MARIA, NOTE)).toEqual({
      ok: true,
      value: { ...NOTE, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("SYNC-03 replaces the note with the last write to reach the server", async () => {
    await putNote(harness.deps(), MARIA, NOTE);
    harness.advance(60_000);

    const saved = await putNote(harness.deps(), MARIA, { ...NOTE, text: "Milk", author: "" });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...NOTE,
        text: "Milk",
        author: "",
        updatedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("NOTE-02 saves a 280-character message from a 32-character author", async () => {
    const full = { ...NOTE, text: "a".repeat(280), author: "b".repeat(32) };

    expect(await putNote(harness.deps(), MARIA, full)).toMatchObject({ ok: true, value: full });
  });

  it("SYNC-03 delete wins: a put on a deleted note answers the tombstone unchanged", async () => {
    await putNote(harness.deps(), MARIA, NOTE);
    const tombstone = await deleteNote(harness.deps(), MARIA, NOTE.id);

    expect(await putNote(harness.deps(), MARIA, { ...NOTE, text: "Back again" })).toEqual(
      tombstone,
    );
  });

  it("tech§5 refuses to write over another account's note", async () => {
    await putNote(harness.deps(), MARIA, NOTE);

    expect(await putNote(harness.deps(), OMAR, { ...NOTE, text: "Mine now" })).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await harness.globalVersion()).toBe(1);
  });
});

describe("deleteNote", () => {
  it("SYNC-03 keeps a tombstone stamped with the delete time and the next version", async () => {
    await putNote(harness.deps(), MARIA, NOTE);
    harness.advance(60_000);

    expect(await deleteNote(harness.deps(), MARIA, NOTE.id)).toEqual({
      ok: true,
      value: {
        ...NOTE,
        updatedAt: "2026-10-09T14:01:00.000Z",
        deletedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("tech§5 answers not-found for a note the server never had", async () => {
    expect(await deleteNote(harness.deps(), MARIA, NOTE.id)).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("tech§5 refuses to delete another account's note", async () => {
    await putNote(harness.deps(), MARIA, NOTE);

    expect(await deleteNote(harness.deps(), OMAR, NOTE.id)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await harness.globalVersion()).toBe(1);
  });
});
