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

async function liveNoteIds(accountId: string): Promise<string[]> {
  const rows = await harness
    .deps()
    .db.all<{ id: string }>(
      "SELECT id FROM notes WHERE account_id = $1 AND deleted_at IS NULL ORDER BY id",
      [accountId],
    );

  return rows.map((row) => row.id);
}

function noteRow(id: string) {
  return harness
    .deps()
    .db.one("SELECT text, deleted_at, updated_at, version FROM notes WHERE id = $1", [id]);
}

describe("expireNotes", () => {
  it("NOTE-08 soft-deletes notes older than the default week and keeps younger ones", async () => {
    await putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    await putNote(harness.deps(), MARIA, note(2, 6 * DAY_MS));

    await expireNotes(harness.deps());

    expect(await liveNoteIds(MARIA)).toEqual([note(2, 0).id]);
  });

  it("NOTE-08 follows the account's one-day expiry", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: "1d" });
    await putNote(harness.deps(), MARIA, note(1, 25 * 60 * 60 * 1000));
    await putNote(harness.deps(), MARIA, note(2, 23 * 60 * 60 * 1000));

    await expireNotes(harness.deps());

    expect(await liveNoteIds(MARIA)).toEqual([note(2, 0).id]);
  });

  it("NOTE-08 never expires notes when the account turned expiry off", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: null });
    await putNote(harness.deps(), MARIA, note(1, 90 * DAY_MS));

    await expireNotes(harness.deps());

    expect(await liveNoteIds(MARIA)).toEqual([note(1, 0).id]);
  });

  it("SYNC-03 keeps the expired note as a tombstone stamped with now and the next version", async () => {
    await putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    harness.advance(60_000);

    await expireNotes(harness.deps());

    expect(await noteRow(note(1, 0).id)).toEqual({
      text: "Note 1",
      deleted_at: "2026-10-09T14:01:00.000Z",
      updated_at: "2026-10-09T14:01:00.000Z",
      version: 2,
    });
  });

  it("tech§5 answers each account's newest version so its displays can be told", async () => {
    await putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    await putNote(harness.deps(), MARIA, note(2, 9 * DAY_MS));
    await putNote(harness.deps(), OMAR, note(3, 8 * DAY_MS));

    expect(await expireNotes(harness.deps())).toEqual([
      { accountId: MARIA, version: 5 },
      { accountId: OMAR, version: 6 },
    ]);
  });

  it("tech§5 leaves a note that is already deleted untouched", async () => {
    await putNote(harness.deps(), MARIA, note(1, 8 * DAY_MS));
    await deleteNote(harness.deps(), MARIA, note(1, 0).id);

    expect(await expireNotes(harness.deps())).toEqual([]);
    expect(await harness.globalVersion()).toBe(2);
  });

  it("tech§5 applies each account's expiry only to that account's notes", async () => {
    await putSettings(harness.deps(), MARIA, MARIA, { ...DEFAULT_SETTINGS, noteExpiry: null });
    await putSettings(harness.deps(), OMAR, OMAR, { ...DEFAULT_SETTINGS, noteExpiry: "1d" });
    await putNote(harness.deps(), MARIA, note(1, 2 * DAY_MS));
    await putNote(harness.deps(), OMAR, note(2, 2 * DAY_MS));

    await expireNotes(harness.deps());

    expect(await liveNoteIds(MARIA)).toEqual([note(1, 0).id]);
    expect(await liveNoteIds(OMAR)).toEqual([]);
  });
});
