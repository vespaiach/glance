import type { CalendarEvent, Tag } from "@/domain/schemas";
import { deleteEvent, putEvent } from "./events";
import { putNote } from "./notes";
import { pullChanges } from "./sync";
import { putTag } from "./tags";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const EVENT: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  endAt: "2026-10-09T22:00:00.000Z",
  location: "Rec center",
  everyone: true,
  tagIds: [],
  notify: true,
};

const tag = (n: number, name: string): Tag => ({
  id: `0192f3a0-3333-7000-8000-00000000000${n}`,
  name,
  color: "sky",
  createdAt: "2026-10-01T15:00:00.000Z",
});

const MOM = tag(1, "Mom");

const DAD = tag(2, "Dad");

describe("putEvent", () => {
  it("SYNC-01 saves a new event stamped with the server time and the next version", async () => {
    const saved = await putEvent(harness.deps(), MARIA, EVENT);

    expect(saved).toEqual({
      ok: true,
      value: { ...EVENT, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
    expect(await harness.globalVersion()).toBe(1);
  });

  it("SYNC-01 leaves out optional fields the event doesn't have", async () => {
    const { endAt: _, location: __, ...allDay } = EVENT;

    const saved = await putEvent(harness.deps(), MARIA, allDay);

    expect(saved).toEqual({
      ok: true,
      value: { ...allDay, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("SYNC-03 replaces the event with the last write to reach the server", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);
    harness.advance(60_000);

    const saved = await putEvent(harness.deps(), MARIA, {
      ...EVENT,
      title: "Swim lesson (pool B)",
    });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...EVENT,
        title: "Swim lesson (pool B)",
        updatedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("tech§5 stamps every write with one version counter shared by all entities", async () => {
    await putNote(harness.deps(), MARIA, {
      id: "0192f3a0-2222-7000-8000-000000000001",
      text: "Milk",
      author: "Maria",
      createdAt: "2026-10-09T13:00:00.000Z",
      rotation: -1.5,
    });

    const saved = await putEvent(harness.deps(), OMAR, EVENT);

    expect(saved.ok && saved.value.version).toBe(2);
  });

  it("SYNC-03 delete wins: a put on a deleted event answers the tombstone unchanged", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);
    const tombstone = await deleteEvent(harness.deps(), MARIA, EVENT.id);
    harness.advance(60_000);

    const saved = await putEvent(harness.deps(), MARIA, { ...EVENT, title: "Back again" });

    expect(saved).toEqual(tombstone);
    expect(await harness.globalVersion()).toBe(2);
  });

  it("tech§5 refuses to write over another account's event", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);

    const saved = await putEvent(harness.deps(), OMAR, { ...EVENT, title: "Mine now" });

    expect(saved).toEqual({ ok: false, error: "not-found" });
    expect(await putEvent(harness.deps(), MARIA, EVENT)).toMatchObject({
      ok: true,
      value: { title: "Swim lesson", version: 2 },
    });
  });
});

describe("putEvent tags", () => {
  it("NOTIF-09 saves the event's notification off", async () => {
    const saved = await putEvent(harness.deps(), MARIA, { ...EVENT, notify: false });

    expect(saved).toEqual({
      ok: true,
      value: { ...EVENT, notify: false, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("D29 saves an event without a notification as on", async () => {
    const { notify: _, ...older } = EVENT;

    await putEvent(harness.deps(), MARIA, older);

    expect(await harness.deps().db.events.find(EVENT.id)).toMatchObject({
      value: { notify: true },
    });
  });

  it("NOTIF-09 refuses to change another account's event notification", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);

    expect(await putEvent(harness.deps(), OMAR, { ...EVENT, notify: false })).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("D24 saves a plan for some tags with its notes", async () => {
    await putTag(harness.deps(), MARIA, MOM);
    await putTag(harness.deps(), MARIA, DAD);
    const plan = { ...EVENT, everyone: false, tagIds: [DAD.id, MOM.id], notes: "Bring towels" };

    const saved = await putEvent(harness.deps(), MARIA, plan);

    expect(saved).toEqual({
      ok: true,
      value: { ...plan, updatedAt: "2026-10-09T14:00:00.000Z", version: 3 },
    });
  });

  it("D24 drops tag ids that aren't live tags of the account", async () => {
    await putTag(harness.deps(), MARIA, MOM);
    const omars = tag(3, "Omar");
    await putTag(harness.deps(), OMAR, omars);

    const saved = await putEvent(harness.deps(), MARIA, {
      ...EVENT,
      everyone: false,
      tagIds: [omars.id, MOM.id, tag(4, "Unknown").id],
    });

    expect(saved.ok && saved.value.tagIds).toEqual([MOM.id]);
  });

  it("D24 stores a plan left with no live tags as nobody", async () => {
    const omars = tag(3, "Omar");
    await putTag(harness.deps(), OMAR, omars);

    const saved = await putEvent(harness.deps(), MARIA, {
      ...EVENT,
      everyone: false,
      tagIds: [omars.id],
    });

    expect(saved).toEqual({
      ok: true,
      value: {
        ...EVENT,
        everyone: false,
        tagIds: [],
        updatedAt: "2026-10-09T14:00:00.000Z",
        version: 2,
      },
    });
  });

  it("EVT-11 saves a plan for nobody", async () => {
    const nobody = { ...EVENT, everyone: false, tagIds: [] };

    const saved = await putEvent(harness.deps(), MARIA, nobody);

    expect(saved).toEqual({
      ok: true,
      value: { ...nobody, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });
});

describe("putEvent all day", () => {
  const { endAt: _, ...timed } = EVENT;

  const NO_SCHOOL: CalendarEvent = {
    ...timed,
    title: "No school",
    startAt: "2026-10-16T00:00:00.000Z",
    allDay: true,
  };

  it("D21 saves an all-day event and answers it with allDay", async () => {
    expect(await putEvent(harness.deps(), MARIA, NO_SCHOOL)).toEqual({
      ok: true,
      value: { ...NO_SCHOOL, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("D21 an edit back to set times stores the event as timed again", async () => {
    await putEvent(harness.deps(), MARIA, NO_SCHOOL);

    await putEvent(harness.deps(), MARIA, EVENT);

    const deleted = await deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(deleted.ok && deleted.value.allDay).toBeUndefined();
  });

  it("D21 a tombstone keeps allDay", async () => {
    await putEvent(harness.deps(), MARIA, NO_SCHOOL);

    const deleted = await deleteEvent(harness.deps(), MARIA, NO_SCHOOL.id);

    expect(deleted.ok && deleted.value.allDay).toBe(true);
  });

  it("tech§5 refuses to turn another account's event all day", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);

    expect(await putEvent(harness.deps(), OMAR, NO_SCHOOL)).toEqual({
      ok: false,
      error: "not-found",
    });

    const deleted = await deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(deleted.ok && deleted.value.allDay).toBeUndefined();
  });
});

describe("putEvent repeat", () => {
  const SERIES: CalendarEvent = { ...EVENT, repeat: "weekly" };

  it("EVT-14 saves a weekly series and its tombstone keeps the repeat", async () => {
    expect(await putEvent(harness.deps(), MARIA, SERIES)).toMatchObject({
      ok: true,
      value: { repeat: "weekly" },
    });

    const deleted = await deleteEvent(harness.deps(), MARIA, SERIES.id);

    expect(deleted.ok && deleted.value.repeat).toBe("weekly");
  });

  it("tech§5 another account can't read or change a series' exception dates", async () => {
    await putEvent(harness.deps(), MARIA, { ...SERIES, exdates: ["2026-10-16"] });

    expect(await putEvent(harness.deps(), OMAR, { ...SERIES, exdates: ["2026-10-23"] })).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await pullChanges(harness.deps(), OMAR, undefined)).toMatchObject({ changes: [] });
    expect(await pullChanges(harness.deps(), MARIA, undefined)).toMatchObject({
      changes: [{ entity: "events", row: { exdates: ["2026-10-16"] } }],
    });
  });

  it("tech§5 refuses to change or delete another account's weekly series", async () => {
    await putEvent(harness.deps(), MARIA, SERIES);

    expect(await putEvent(harness.deps(), OMAR, EVENT)).toEqual({ ok: false, error: "not-found" });
    expect(await deleteEvent(harness.deps(), OMAR, SERIES.id)).toEqual({
      ok: false,
      error: "not-found",
    });

    expect(await deleteEvent(harness.deps(), MARIA, SERIES.id)).toMatchObject({
      ok: true,
      value: { repeat: "weekly", version: 2 },
    });
  });
});

describe("deleteEvent", () => {
  it("SYNC-03 keeps a tombstone stamped with the delete time and the next version", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);
    harness.advance(60_000);

    const deleted = await deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(deleted).toEqual({
      ok: true,
      value: {
        ...EVENT,
        updatedAt: "2026-10-09T14:01:00.000Z",
        deletedAt: "2026-10-09T14:01:00.000Z",
        version: 2,
      },
    });
  });

  it("SYNC-02 answers the same tombstone when the delete is replayed", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);
    const first = await deleteEvent(harness.deps(), MARIA, EVENT.id);
    harness.advance(60_000);

    const again = await deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(again).toEqual(first);
    expect(await harness.globalVersion()).toBe(2);
  });

  it("tech§5 answers not-found for an event the server never had", async () => {
    expect(await deleteEvent(harness.deps(), MARIA, EVENT.id)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(await harness.globalVersion()).toBe(0);
  });

  it("tech§5 refuses to delete another account's event", async () => {
    await putEvent(harness.deps(), MARIA, EVENT);

    const deleted = await deleteEvent(harness.deps(), OMAR, EVENT.id);

    expect(deleted).toEqual({ ok: false, error: "not-found" });
    expect(await putEvent(harness.deps(), MARIA, EVENT)).toMatchObject({ ok: true, value: EVENT });
  });
});
