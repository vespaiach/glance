import { DEFAULT_SETTINGS } from "@/domain/defaults";
import type { CalendarEvent, Note } from "@/domain/schemas";
import { deleteEvent, putEvent } from "./events";
import { putNote } from "./notes";
import { putSettings } from "./settings";
import { pullChanges } from "./sync";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const STAMP = "2026-10-09T14:00:00.000Z";

const EVENT: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  tone: 2,
};

const NOTE: Note = {
  id: "0192f3a0-2222-7000-8000-000000000001",
  text: "Milk and eggs",
  author: "Maria",
  createdAt: "2026-10-09T13:00:00.000Z",
  tone: "soft",
  rotation: -1.5,
};

const PHOTO_ID = "0192f3a0-3333-7000-8000-000000000001";

function insertPhoto(accountId: string, version: number, takenOn: string | null): void {
  harness
    .deps()
    .db.prepare(
      `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, version)
       VALUES (?, ?, 'Cannon Beach', ?, NULL, 'x', '2026-10-01T18:30:00.000Z', ?)`,
    )
    .run(PHOTO_ID, accountId, takenOn, version);
}

describe("pullChanges", () => {
  it("SYNC-02 answers no changes and the current version when nothing was written", () => {
    expect(pullChanges(harness.deps(), MARIA, undefined)).toEqual({ cursor: "0", changes: [] });
  });

  it("SYNC-02 without a cursor returns every row of the account in version order", () => {
    putNote(harness.deps(), MARIA, NOTE);
    putEvent(harness.deps(), MARIA, EVENT);
    putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS);

    expect(pullChanges(harness.deps(), MARIA, undefined)).toEqual({
      cursor: "3",
      changes: [
        { entity: "notes", row: { ...NOTE, updatedAt: STAMP, version: 1 } },
        { entity: "events", row: { ...EVENT, updatedAt: STAMP, version: 2 } },
        {
          entity: "settings",
          row: { ...DEFAULT_SETTINGS, accountId: MARIA, updatedAt: STAMP, version: 3 },
        },
      ],
    });
  });

  it("SYNC-02 returns only the rows changed after the cursor", () => {
    putNote(harness.deps(), MARIA, NOTE);
    putEvent(harness.deps(), MARIA, EVENT);
    putNote(harness.deps(), MARIA, { ...NOTE, text: "Milk" });

    expect(pullChanges(harness.deps(), MARIA, 2)).toEqual({
      cursor: "3",
      changes: [{ entity: "notes", row: { ...NOTE, text: "Milk", updatedAt: STAMP, version: 3 } }],
    });
  });

  it("SYNC-02 returns deletions as tombstones", () => {
    putEvent(harness.deps(), MARIA, EVENT);
    deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(pullChanges(harness.deps(), MARIA, 1)).toEqual({
      cursor: "2",
      changes: [
        { entity: "events", row: { ...EVENT, updatedAt: STAMP, deletedAt: STAMP, version: 2 } },
      ],
    });
  });

  it("SYNC-02 returns photos with their upload time as the update time", () => {
    insertPhoto(MARIA, 4, "2026-09-28");

    expect(pullChanges(harness.deps(), MARIA, undefined).changes).toEqual([
      {
        entity: "photos",
        row: {
          id: PHOTO_ID,
          title: "Cannon Beach",
          takenOn: "2026-09-28",
          createdAt: "2026-10-01T18:30:00.000Z",
          updatedAt: "2026-10-01T18:30:00.000Z",
          version: 4,
        },
      },
    ]);
  });

  it("PHOTO-03 dates a photo with no taken date by its upload day", () => {
    insertPhoto(MARIA, 1, null);

    expect(pullChanges(harness.deps(), MARIA, undefined).changes[0]?.row).toMatchObject({
      takenOn: "2026-10-01",
    });
  });

  it("tech§5 never returns another account's rows", () => {
    putEvent(harness.deps(), OMAR, EVENT);
    putNote(harness.deps(), OMAR, NOTE);
    putSettings(harness.deps(), OMAR, OMAR, DEFAULT_SETTINGS);
    insertPhoto(OMAR, 4, "2026-09-28");

    expect(pullChanges(harness.deps(), MARIA, undefined)).toEqual({ cursor: "3", changes: [] });
  });
});
