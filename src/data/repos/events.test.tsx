import { act, renderHook, waitFor } from "@testing-library/react";
import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import {
  createEventsRepo,
  useEvent,
  useEventsInMonth,
  useEventsOnDay,
  useHasEvents,
  useNextEventAfter,
  useUpcomingEvent,
} from "./events";
import { type Harness, openHarness, synced, TEST_NOW, wrapperFor } from "./testHarness";

const tz = deviceTimeZone();

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

    const { result } = renderHook(() => useEventsOnDay("2026-10-09", tz), {
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

    const { result } = renderHook(() => useEventsInMonth(2026, 9, tz), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id, NEXT_DAY.id]),
    );

    await act(() => createEventsRepo(store).remove(NEXT_DAY.id));

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id]));
  });

  it("EVT-01 useEvent reads one live event and null once it is removed", async () => {
    await store.db.events.put(synced(SOCCER));

    const { result } = renderHook(() => useEvent(SOCCER.id), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.title).toBe("Soccer practice"));

    await act(() => createEventsRepo(store).remove(SOCCER.id));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("CAL-04 useHasEvents is false with no live events and true once one is saved", async () => {
    await store.db.events.put({ ...synced(SOCCER), deletedAt: TEST_NOW.toISOString() });

    const { result } = renderHook(() => useHasEvents(), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toBe(false));

    await act(() => createEventsRepo(store).put(NEXT_MONTH));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("AMB-03 useNextEventAfter reads the first live event after the day, skipping removed ones", async () => {
    const later = event(5, at(9, 10, 8));

    await store.db.events.bulkPut([
      synced(SOCCER),
      synced(NEXT_MONTH),
      synced(NEXT_DAY),
      { ...synced(later), deletedAt: TEST_NOW.toISOString() },
    ]);

    const { result } = renderHook(() => useNextEventAfter("2026-10-09", tz), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(NEXT_DAY.id));
  });

  it("AMB-03 useNextEventAfter is null with nothing after the day", async () => {
    await store.db.events.put(synced(SOCCER));

    const { result } = renderHook(() => useNextEventAfter("2026-10-09", tz), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current).toBeNull());
  });
});

describe("useUpcomingEvent", () => {
  const TEN_41 = new Date(2026, 9, 9, 10, 41);

  it("LOC-09 reads the first live event starting after now, today included", async () => {
    const earlier = event(5, at(9, 9, 8));

    const removed = event(6, at(9, 9, 12));

    await store.db.events.bulkPut([
      synced(SOCCER),
      synced(earlier),
      synced(DENTIST),
      synced(NEXT_DAY),
      { ...synced(removed), deletedAt: TEST_NOW.toISOString() },
    ]);

    const { result } = renderHook(() => useUpcomingEvent(TEN_41), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(SOCCER.id));
  });

  it("LOC-09 is null with nothing after now", async () => {
    await store.db.events.put(synced(DENTIST));

    const { result } = renderHook(() => useUpcomingEvent(TEN_41), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current).toBeNull());
  });
});

describe("event hooks in a zone", () => {
  const LA = "America/Los_Angeles";

  const FRIDAY_NIGHT = event(6, "2026-10-10T06:30:00.000Z");

  const FRIDAY_MORNING_KOLKATA = event(7, "2026-10-09T06:30:00.000Z");

  const HALLOWEEN_NIGHT = event(8, "2026-11-01T06:30:00.000Z");

  it("LOC-06 useEventsOnDay reads the day from the given zone's midnight", async () => {
    await store.db.events.bulkPut([synced(FRIDAY_NIGHT), synced(FRIDAY_MORNING_KOLKATA)]);

    const { result } = renderHook(() => useEventsOnDay("2026-10-09", LA), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([FRIDAY_NIGHT.id]));
  });

  it("LOC-06 useEventsInMonth reads the month in the given zone", async () => {
    await store.db.events.bulkPut([synced(HALLOWEEN_NIGHT)]);

    const { result } = renderHook(() => useEventsInMonth(2026, 9, LA), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([HALLOWEEN_NIGHT.id]));
  });

  it("LOC-06 useNextEventAfter starts at the next midnight in the given zone", async () => {
    await store.db.events.bulkPut([synced(FRIDAY_NIGHT), synced(NEXT_MONTH)]);

    const { result } = renderHook(() => useNextEventAfter("2026-10-09", LA), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(NEXT_MONTH.id));
  });
});
