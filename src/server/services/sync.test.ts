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

async function insertPhoto(
  accountId: string,
  version: number,
  takenOn: string | null,
): Promise<void> {
  await harness.deps().db.run(
    `INSERT INTO photos (id, account_id, title, taken_on, place, file_path, created_at, updated_at,
       version, title_source, date_source, place_source)
       VALUES ($1, $2, 'Cannon Beach', $3, NULL, 'x', '2026-10-01T18:30:00.000Z',
       '2026-10-02T08:00:00.000Z', $4, 'place', 'photo', 'none')`,
    [PHOTO_ID, accountId, takenOn, version],
  );
}

describe("pullChanges", () => {
  it("SYNC-02 answers no changes and the current version when nothing was written", async () => {
    expect(await pullChanges(harness.deps(), MARIA, undefined)).toEqual({
      cursor: "0",
      changes: [],
    });
  });

  it("SYNC-02 without a cursor returns every row of the account in version order", async () => {
    await putNote(harness.deps(), MARIA, NOTE);
    await putEvent(harness.deps(), MARIA, EVENT);
    await putSettings(harness.deps(), MARIA, MARIA, DEFAULT_SETTINGS);

    expect(await pullChanges(harness.deps(), MARIA, undefined)).toEqual({
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

  it("SYNC-02 returns only the rows changed after the cursor", async () => {
    await putNote(harness.deps(), MARIA, NOTE);
    await putEvent(harness.deps(), MARIA, EVENT);
    await putNote(harness.deps(), MARIA, { ...NOTE, text: "Milk" });

    expect(await pullChanges(harness.deps(), MARIA, 2)).toEqual({
      cursor: "3",
      changes: [{ entity: "notes", row: { ...NOTE, text: "Milk", updatedAt: STAMP, version: 3 } }],
    });
  });

  it("SYNC-02 returns deletions as tombstones", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);
    await deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(await pullChanges(harness.deps(), MARIA, 1)).toEqual({
      cursor: "2",
      changes: [
        { entity: "events", row: { ...EVENT, updatedAt: STAMP, deletedAt: STAMP, version: 2 } },
      ],
    });
  });

  it("D22 returns photos with their update time, sources and checked", async () => {
    await insertPhoto(MARIA, 4, "2026-09-28");

    expect((await pullChanges(harness.deps(), MARIA, undefined)).changes).toEqual([
      {
        entity: "photos",
        row: {
          id: PHOTO_ID,
          title: "Cannon Beach",
          takenOn: "2026-09-28",
          createdAt: "2026-10-01T18:30:00.000Z",
          updatedAt: "2026-10-02T08:00:00.000Z",
          version: 4,
          sources: { title: "place", takenOn: "photo", place: "none" },
          checked: false,
        },
      },
    ]);
  });

  it("PHOTO-11 returns a photo with no taken date without takenOn, so it reads No date", async () => {
    await insertPhoto(MARIA, 1, null);

    expect(
      (await pullChanges(harness.deps(), MARIA, undefined)).changes[0]?.row,
    ).not.toHaveProperty("takenOn");
  });

  it("D21 returns an all-day event with allDay", async () => {
    const allDay: CalendarEvent = { ...EVENT, startAt: "2026-10-16T00:00:00.000Z", allDay: true };

    await putEvent(harness.deps(), MARIA, allDay);

    expect(await pullChanges(harness.deps(), MARIA, undefined)).toEqual({
      cursor: "1",
      changes: [{ entity: "events", row: { ...allDay, updatedAt: STAMP, version: 1 } }],
    });
  });

  it("tech§5 never returns another account's rows", async () => {
    await putEvent(harness.deps(), OMAR, EVENT);
    await putNote(harness.deps(), OMAR, NOTE);
    await putSettings(harness.deps(), OMAR, OMAR, DEFAULT_SETTINGS);
    await insertPhoto(OMAR, 4, "2026-09-28");

    expect(await pullChanges(harness.deps(), MARIA, undefined)).toEqual({
      cursor: "3",
      changes: [],
    });
  });

  it("tech§5 concurrent writes get distinct versions, and a pull never skips one that commits later", async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `0192f3a0-2222-7000-8000-00000000001${i}`);

    const [writes, pulls] = await Promise.all([
      Promise.all(ids.map((id) => putNote(harness.deps(), MARIA, { ...NOTE, id }))),
      Promise.all(ids.map(() => pullChanges(harness.deps(), MARIA, undefined))),
    ]);

    expect(writes.map((saved) => saved.ok && saved.value.version).sort()).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    for (const pull of pulls) {
      expect(pull.changes.map((change) => change.row.version)).toEqual(
        Array.from({ length: Number(pull.cursor) }, (_, i) => i + 1),
      );
    }
  });
});
