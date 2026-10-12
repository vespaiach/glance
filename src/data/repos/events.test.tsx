import { act, renderHook, waitFor } from "@testing-library/react";
import type { CalendarEvent } from "@/domain/schemas";
import { createEventsRepo, useEventsInMonth, useEventsOnDay } from "./events";
import { type Harness, openHarness, synced, TEST_NOW, wrapperFor } from "./testHarness";

const at = (month: number, day: number, hour: number) =>
  new Date(2026, month, day, hour).toISOString();

function event(n: number, startAt: string, title = `Event ${n}`): CalendarEvent {
  return { id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`, startAt, title, tone: 1 };
}

const SOCCER = event(1, at(9, 9, 15), "Soccer practice");

const DENTIST = event(2, at(9, 9, 10), "Dentist");

const NEXT_DAY = event(3, at(9, 10, 9));

const NEXT_MONTH = event(4, at(10, 1, 9));

let store: Harness;

beforeEach(() => {
  store = openHarness("glance-events-repo-test");
});

afterEach(() => store.close());

describe("events repo", () => {
  it("tech§4.2 put writes the row and a put outbox entry, then nudges", async () => {
    await createEventsRepo(store).put(SOCCER);

    const row = { ...SOCCER, updatedAt: TEST_NOW.toISOString(), version: 0 };

    expect(await store.db.events.get(SOCCER.id)).toEqual(row);
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "events", entityId: SOCCER.id, op: "put", payload: row, attempts: 0 },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("tech§4.2 an edit keeps the server fields the row already has", async () => {
    await store.db.events.put(synced(SOCCER, 7));

    await createEventsRepo(store).put({ ...SOCCER, title: "Soccer game" });

    expect(await store.db.events.get(SOCCER.id)).toMatchObject({
      title: "Soccer game",
      updatedAt: "2026-10-01T09:00:00.000Z",
      version: 7,
    });
  });

  it("tech§4.2 the row and the outbox entry are written in one transaction", async () => {
    store.db.outbox.hook("creating", () => {
      throw new Error("outbox full");
    });

    await expect(createEventsRepo(store).put(SOCCER)).rejects.toThrow("outbox full");

    expect(await store.db.events.get(SOCCER.id)).toBeUndefined();
    expect(store.nudge).not.toHaveBeenCalled();
  });

  it("tech§4.2 remove marks the row deleted and queues a delete without a payload", async () => {
    await store.db.events.put(synced(SOCCER));

    await createEventsRepo(store).remove(SOCCER.id);

    expect((await store.db.events.get(SOCCER.id))?.deletedAt).toBe(TEST_NOW.toISOString());
    expect(await store.db.outbox.toArray()).toEqual([
      { seq: 1, entity: "events", entityId: SOCCER.id, op: "delete", attempts: 0 },
    ]);
    expect(store.nudge).toHaveBeenCalledTimes(1);
  });

  it("tech§4.2 removing an unknown event queues nothing", async () => {
    await createEventsRepo(store).remove(SOCCER.id);

    expect(await store.db.outbox.count()).toBe(0);
    expect(store.nudge).not.toHaveBeenCalled();
  });
});

describe("event hooks", () => {
  it("EVT-07 useEventsOnDay lists the day's events by start and updates after a put", async () => {
    await store.db.events.bulkPut([synced(SOCCER), synced(NEXT_DAY)]);

    const { result } = renderHook(() => useEventsOnDay("2026-10-09"), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id]));

    await act(() => createEventsRepo(store).put(DENTIST));

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([DENTIST.id, SOCCER.id]),
    );
  });

  it("CAL-02 useEventsInMonth lists the month's events and drops a removed one", async () => {
    await store.db.events.bulkPut([synced(SOCCER), synced(NEXT_DAY), synced(NEXT_MONTH)]);

    const { result } = renderHook(() => useEventsInMonth(2026, 9), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id, NEXT_DAY.id]),
    );

    await act(() => createEventsRepo(store).remove(NEXT_DAY.id));

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id]));
  });
});
