import { err } from "@/domain/result";
import type { ApiEvent, Tag } from "@/domain/schemas";
import {
  changeApiEvent,
  createApiEvent,
  deleteApiEvent,
  listApiEvents,
  readApiEvent,
} from "./apiEvents";
import { pullChanges } from "./sync";
import { putTag } from "./tags";
import { MARIA, OMAR, serviceHarnessPerTest } from "./testServices";

const harness = serviceHarnessPerTest();

const tag = (n: number, name: string, createdAt: string): Tag => ({
  id: `0192f3a0-3333-7000-8000-00000000000${n}`,
  name,
  color: "sky",
  createdAt,
});

const DAD = tag(2, "Dad", "2026-10-02T15:00:00.000Z");

const MOM = tag(1, "Mom", "2026-10-01T15:00:00.000Z");

const SWIM = {
  title: "Swim lesson",
  start: "2026-10-12T15:00:00-04:00",
  end: "2026-10-12T16:00:00-04:00",
  place: "Rec center",
};

async function created(input: object, accountId = MARIA): Promise<ApiEvent> {
  const saved = await createApiEvent(harness.deps(), accountId, input as never);

  if (!saved.ok) throw new Error(saved.error);

  return saved.value.event;
}

beforeEach(async () => {
  await putTag(harness.deps(), MARIA, DAD);
  await putTag(harness.deps(), MARIA, MOM);
});

describe("createApiEvent", () => {
  it("API-06 creates an event that reaches the sync pull and answers its id", async () => {
    const event = await created(SWIM);

    expect(event).toEqual({
      id: expect.any(String),
      title: "Swim lesson",
      start: "2026-10-12T19:00:00.000Z",
      end: "2026-10-12T20:00:00.000Z",
      place: "Rec center",
    });
    expect((await pullChanges(harness.deps(), MARIA, 0)).changes).toContainEqual({
      entity: "events",
      row: expect.objectContaining({
        id: event.id,
        title: "Swim lesson",
        startAt: "2026-10-12T19:00:00.000Z",
        location: "Rec center",
        everyone: true,
        tagIds: [],
        notify: true,
      }),
    });
  });

  it("API-06 a missing who is everyone", async () => {
    const event = await created(SWIM);

    expect(event.who).toBeUndefined();
    expect((await readStored(event.id))?.everyone).toBe(true);
  });

  it("API-06 matches who names ignoring case and answers them in tag order", async () => {
    const event = await created({ ...SWIM, who: ["dad", "MOM"] });

    expect(event.who).toEqual(["Mom", "Dad"]);
    expect((await readStored(event.id))?.tagIds).toEqual([MOM.id, DAD.id]);
  });

  it("API-06 an empty who is no one", async () => {
    const event = await created({ ...SWIM, who: [] });

    expect(event.who).toEqual([]);
    expect(await readStored(event.id)).toMatchObject({ everyone: false, tagIds: [] });
  });

  it("API-06 an unknown who name is invalid and saves nothing", async () => {
    expect(await createApiEvent(harness.deps(), MARIA, { ...SWIM, who: ["Grandpa"] })).toEqual(
      err("who"),
    );
    expect(await listApiEvents(harness.deps(), MARIA, {})).toEqual([]);
  });

  it("API-06 another account's member names are unknown", async () => {
    expect(await createApiEvent(harness.deps(), OMAR, { ...SWIM, who: ["Mom"] })).toEqual(
      err("who"),
    );
  });

  it("API-06 creates an all-day event from a local date", async () => {
    const event = await created({ title: "Field trip", start: "2026-10-14", allDay: true });

    expect(event).toEqual({
      id: expect.any(String),
      title: "Field trip",
      start: "2026-10-14",
      allDay: true,
    });
    expect((await readStored(event.id))?.startAt).toBe("2026-10-14T00:00:00.000Z");
  });

  it("API-06 rejects a start that doesn't match allDay", async () => {
    expect(
      await createApiEvent(harness.deps(), MARIA, { title: "Trip", start: "2026-10-14" }),
    ).toEqual(err("start"));
    expect(
      await createApiEvent(harness.deps(), MARIA, { ...SWIM, end: undefined, allDay: true }),
    ).toEqual(err("start"));
  });

  it("TPK-07 rejects an end before the start, on another local day or on an all-day event", async () => {
    const create = (input: object) => createApiEvent(harness.deps(), MARIA, input as never);

    expect(await create({ ...SWIM, end: "2026-10-12T14:00:00-04:00" })).toEqual(err("end"));
    expect(await create({ ...SWIM, end: "2026-10-13T01:00:00-04:00" })).toEqual(err("end"));
    expect(
      await create({ title: "Trip", start: "2026-10-14", allDay: true, end: SWIM.end }),
    ).toEqual(err("end"));
  });

  it("API-06 keeps a weekly series with its skipped weeks", async () => {
    const event = await created({ ...SWIM, repeat: "weekly", exdates: ["2026-10-19"] });

    expect(event).toMatchObject({ repeat: "weekly", exdates: ["2026-10-19"] });
  });
});

describe("readApiEvent", () => {
  it("API-05 answers one event by id", async () => {
    const event = await created(SWIM);

    expect(await readApiEvent(harness.deps(), MARIA, event.id)).toEqual({ ok: true, value: event });
  });

  it("API-01 another account's event is not found", async () => {
    const event = await created(SWIM);

    expect(await readApiEvent(harness.deps(), OMAR, event.id)).toEqual(err("not-found"));
  });

  it("API-05 a deleted or unknown event is not found", async () => {
    const event = await created(SWIM);
    await deleteApiEvent(harness.deps(), MARIA, event.id);

    expect(await readApiEvent(harness.deps(), MARIA, event.id)).toEqual(err("not-found"));
    expect(await readApiEvent(harness.deps(), MARIA, "nope")).toEqual(err("not-found"));
  });
});

describe("changeApiEvent", () => {
  it("API-07 changes only the given fields", async () => {
    const event = await created({ ...SWIM, who: ["Mom"], notes: "Bring goggles" });

    const changed = await changeApiEvent(harness.deps(), MARIA, event.id, { title: "Swim" });

    expect(changed).toEqual({
      ok: true,
      value: { event: { ...event, title: "Swim" }, version: expect.any(Number) },
    });
  });

  it("API-07 null clears an optional field", async () => {
    const event = await created(SWIM);

    const changed = await changeApiEvent(harness.deps(), MARIA, event.id, { place: null });

    expect(changed.ok && changed.value.event.place).toBeUndefined();
  });

  it("API-07 checks the changed event like a new one", async () => {
    const event = await created(SWIM);

    expect(
      await changeApiEvent(harness.deps(), MARIA, event.id, { end: "2026-10-12T14:00:00Z" }),
    ).toEqual(err("end"));
  });

  it("NOTIF-09 keeps the event's notification setting", async () => {
    const event = await created(SWIM);
    const stored = await readStored(event.id);
    if (!stored) throw new Error("not saved");
    await harness.deps().db.events.save(MARIA, { ...stored, notify: false });

    await changeApiEvent(harness.deps(), MARIA, event.id, { title: "Swim" });

    expect((await readStored(event.id))?.notify).toBe(false);
  });

  it("API-01 another account's event can't be changed", async () => {
    const event = await created(SWIM);

    expect(await changeApiEvent(harness.deps(), OMAR, event.id, { title: "Mine" })).toEqual(
      err("not-found"),
    );
    expect((await readStored(event.id))?.title).toBe("Swim lesson");
  });
});

describe("deleteApiEvent", () => {
  it("API-08 tombstones the event so the sync pull removes it", async () => {
    const event = await created(SWIM);

    expect((await deleteApiEvent(harness.deps(), MARIA, event.id)).ok).toBe(true);
    expect((await readStored(event.id))?.deletedAt).toBeDefined();
  });

  it("API-08 an already deleted event is not found", async () => {
    const event = await created(SWIM);
    await deleteApiEvent(harness.deps(), MARIA, event.id);

    expect(await deleteApiEvent(harness.deps(), MARIA, event.id)).toEqual(err("not-found"));
  });

  it("API-01 another account's event can't be deleted", async () => {
    const event = await created(SWIM);

    expect(await deleteApiEvent(harness.deps(), OMAR, event.id)).toEqual(err("not-found"));
    expect((await readStored(event.id))?.deletedAt).toBeUndefined();
  });
});

describe("listApiEvents", () => {
  it("API-04 lists live events by start, filtered by local from and to", async () => {
    const late = await created({ ...SWIM, start: "2026-10-13T21:00:00-04:00", end: undefined });
    const early = await created({ title: "Trip", start: "2026-10-13", allDay: true });
    await created({ ...SWIM, start: "2026-10-15T09:00:00-04:00", end: undefined });
    await created({ ...SWIM, start: "2026-10-11T23:30:00-04:00", end: undefined });
    const gone = await created({ ...SWIM, start: "2026-10-13T10:00:00-04:00", end: undefined });
    await deleteApiEvent(harness.deps(), MARIA, gone.id);

    const listed = await listApiEvents(harness.deps(), MARIA, {
      from: "2026-10-12",
      to: "2026-10-14",
    });

    expect(listed.map(({ id }) => id)).toEqual([early.id, late.id]);
  });

  it("API-04 lists a series once while its first day is on or before to", async () => {
    const series = await created({
      ...SWIM,
      start: "2026-10-05T15:00:00-04:00",
      end: undefined,
      repeat: "weekly",
    });
    await created({
      ...SWIM,
      start: "2026-10-20T15:00:00-04:00",
      end: undefined,
      repeat: "weekly",
    });

    const listed = await listApiEvents(harness.deps(), MARIA, {
      from: "2026-10-12",
      to: "2026-10-19",
    });

    expect(listed).toEqual([series]);
  });

  it("API-01 never lists another account's events", async () => {
    await created(SWIM);

    expect(await listApiEvents(harness.deps(), OMAR, {})).toEqual([]);
  });
});

async function readStored(id: string) {
  return (await harness.deps().db.events.find(id))?.value;
}
