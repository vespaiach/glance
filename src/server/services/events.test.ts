import type { CalendarEvent } from "@/domain/schemas";
import { deleteEvent, putEvent } from "./events";
import { putNote } from "./notes";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const EVENT: CalendarEvent = {
  id: "0192f3a0-1111-7000-8000-000000000001",
  title: "Swim lesson",
  startAt: "2026-10-09T21:00:00.000Z",
  endAt: "2026-10-09T22:00:00.000Z",
  location: "Rec center",
  tone: 2,
};

describe("putEvent", () => {
  it("SYNC-01 saves a new event stamped with the server time and the next version", () => {
    const saved = putEvent(harness.deps(), MARIA, EVENT);

    expect(saved).toEqual({
      ok: true,
      value: { ...EVENT, updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
    expect(harness.globalVersion()).toBe(1);
  });

  it("SYNC-01 leaves out optional fields the event doesn't have", () => {
    const { endAt: _, location: __, ...allDay } = EVENT;

    const saved = putEvent(harness.deps(), MARIA, { ...allDay, tone: "accent" });

    expect(saved).toEqual({
      ok: true,
      value: { ...allDay, tone: "accent", updatedAt: "2026-10-09T14:00:00.000Z", version: 1 },
    });
  });

  it("SYNC-03 replaces the event with the last write to reach the server", () => {
    putEvent(harness.deps(), MARIA, EVENT);
    harness.advance(60_000);

    const saved = putEvent(harness.deps(), MARIA, { ...EVENT, title: "Swim lesson (pool B)" });

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

  it("tech§5 stamps every write with one version counter shared by all entities", () => {
    putNote(harness.deps(), MARIA, {
      id: "0192f3a0-2222-7000-8000-000000000001",
      text: "Milk",
      author: "Maria",
      createdAt: "2026-10-09T13:00:00.000Z",
      tone: 1,
      rotation: -1.5,
    });

    const saved = putEvent(harness.deps(), OMAR, EVENT);

    expect(saved.ok && saved.value.version).toBe(2);
  });

  it("SYNC-03 delete wins: a put on a deleted event answers the tombstone unchanged", () => {
    putEvent(harness.deps(), MARIA, EVENT);
    const tombstone = deleteEvent(harness.deps(), MARIA, EVENT.id);
    harness.advance(60_000);

    const saved = putEvent(harness.deps(), MARIA, { ...EVENT, title: "Back again" });

    expect(saved).toEqual(tombstone);
    expect(harness.globalVersion()).toBe(2);
  });

  it("tech§5 refuses to write over another account's event", () => {
    putEvent(harness.deps(), MARIA, EVENT);

    const saved = putEvent(harness.deps(), OMAR, { ...EVENT, title: "Mine now" });

    expect(saved).toEqual({ ok: false, error: "not-found" });
    expect(putEvent(harness.deps(), MARIA, EVENT)).toMatchObject({
      ok: true,
      value: { title: "Swim lesson", version: 2 },
    });
  });
});

describe("deleteEvent", () => {
  it("SYNC-03 keeps a tombstone stamped with the delete time and the next version", () => {
    putEvent(harness.deps(), MARIA, EVENT);
    harness.advance(60_000);

    const deleted = deleteEvent(harness.deps(), MARIA, EVENT.id);

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

  it("SYNC-02 answers the same tombstone when the delete is replayed", () => {
    putEvent(harness.deps(), MARIA, EVENT);
    const first = deleteEvent(harness.deps(), MARIA, EVENT.id);
    harness.advance(60_000);

    const again = deleteEvent(harness.deps(), MARIA, EVENT.id);

    expect(again).toEqual(first);
    expect(harness.globalVersion()).toBe(2);
  });

  it("tech§5 answers not-found for an event the server never had", () => {
    expect(deleteEvent(harness.deps(), MARIA, EVENT.id)).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(harness.globalVersion()).toBe(0);
  });

  it("tech§5 refuses to delete another account's event", () => {
    putEvent(harness.deps(), MARIA, EVENT);

    const deleted = deleteEvent(harness.deps(), OMAR, EVENT.id);

    expect(deleted).toEqual({ ok: false, error: "not-found" });
    expect(putEvent(harness.deps(), MARIA, EVENT)).toMatchObject({ ok: true, value: EVENT });
  });
});
