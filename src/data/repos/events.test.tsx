import { act, renderHook, waitFor } from "@testing-library/react";
import type { CalendarEvent } from "@/domain/schemas";
import { deviceTimeZone } from "@/domain/zone";
import {
  createEventsRepo,
  useEvent,
  useEventRecents,
  useEventsAfter,
  useEventsBetween,
  useEventsInWeek,
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
  return {
    id: `0195f0a0-0000-7000-8000-${String(n).padStart(12, "0")}`,
    startAt,
    title,
    everyone: true,
    tagIds: [],
    notify: true,
  };
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

  it("CAL-01 useEventsInWeek lists the week's events and drops a removed one", async () => {
    await store.db.events.bulkPut([synced(SOCCER), synced(NEXT_DAY), synced(NEXT_MONTH)]);

    const { result } = renderHook(() => useEventsInWeek("2026-10-04", tz), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id, NEXT_DAY.id]),
    );

    await act(() => createEventsRepo(store).remove(NEXT_DAY.id));

    await waitFor(() => expect(result.current?.map((row) => row.id)).toEqual([SOCCER.id]));
  });

  it("CAL-03 useEventsBetween lists events from the first day up to the end day", async () => {
    await store.db.events.bulkPut([synced(SOCCER), synced(NEXT_DAY), synced(NEXT_MONTH)]);

    const { result } = renderHook(() => useEventsBetween("2026-10-10", "2026-11-02", tz), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([NEXT_DAY.id, NEXT_MONTH.id]),
    );
  });

  it("EVT-01 useEvent reads one live event and null once it is removed", async () => {
    await store.db.events.put(synced(SOCCER));

    const { result } = renderHook(() => useEvent(SOCCER.id), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current?.title).toBe("Soccer practice"));

    await act(() => createEventsRepo(store).remove(SOCCER.id));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("EVT-12 useEventRecents lists live titles and places, most recently changed first", async () => {
    await store.db.events.bulkPut([
      {
        ...synced({ ...SOCCER, location: "Riverside Park" }),
        updatedAt: "2026-10-02T09:00:00.000Z",
      },
      { ...synced({ ...DENTIST, location: "Main St" }), updatedAt: "2026-10-03T09:00:00.000Z" },
      { ...synced(NEXT_DAY), deletedAt: TEST_NOW.toISOString() },
    ]);

    const { result } = renderHook(() => useEventRecents(), { wrapper: wrapperFor(store) });

    await waitFor(() =>
      expect(result.current).toEqual({
        titles: ["Dentist", "Soccer practice"],
        places: ["Main St", "Riverside Park"],
      }),
    );
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

  it("TODAY-06 useEventsAfter reads up to the limit of live timed and all-day events after the day", async () => {
    const trip = { ...event(5, "2026-10-12T00:00:00.000Z"), allDay: true as const };

    const removed = { ...synced(event(6, at(9, 10, 8))), deletedAt: TEST_NOW.toISOString() };

    const later = event(7, at(9, 11, 9));

    await store.db.events.bulkPut([
      synced(SOCCER),
      synced(NEXT_MONTH),
      synced(NEXT_DAY),
      synced(later),
      synced(trip),
      removed,
    ]);

    const { result } = renderHook(() => useEventsAfter("2026-10-09", tz, 2), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([trip.id, NEXT_DAY.id, later.id]),
    );
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

  it("LOC-06 useEventsInWeek reads the week in the given zone", async () => {
    await store.db.events.bulkPut([synced(HALLOWEEN_NIGHT)]);

    const { result } = renderHook(() => useEventsInWeek("2026-10-25", LA), {
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

describe("all-day events in the hooks", () => {
  const allDay = (n: number, key: string, title = `All day ${n}`): CalendarEvent => ({
    ...event(n, `${key}T00:00:00.000Z`, title),
    allDay: true,
  });

  const timedAt = (n: number, startAt: string) => event(n, startAt, `Timed ${n}`);

  const NO_SCHOOL = allDay(10, "2026-10-16", "No school");

  const GRANDPA = allDay(11, "2026-10-09", "Grandpa staying over");

  const FIRST = allDay(12, "2026-10-01");

  const NOV_FIRST = allDay(13, "2026-11-01");

  const SEPT_LAST = allDay(14, "2026-09-30");

  const ZONES = ["America/Los_Angeles", "UTC", "Pacific/Guam"];

  async function idsOnDay(key: string, zone: string): Promise<string[] | undefined> {
    const { result } = renderHook(() => useEventsOnDay(key, zone), { wrapper: wrapperFor(store) });

    await waitFor(() => expect(result.current).toBeDefined());

    return result.current?.map((row) => row.id);
  }

  it.each(ZONES)(
    "D21 a day reads its all-day event first, then its timed events, in %s",
    async (zone) => {
      const morning = timedAt(20, "2026-10-16T16:00:00.000Z");

      await store.db.events.bulkPut([synced(morning), synced(NO_SCHOOL), synced(GRANDPA)]);

      const ids = await idsOnDay("2026-10-16", zone);

      expect(ids?.[0]).toBe(NO_SCHOOL.id);
      expect(ids).not.toContain(GRANDPA.id);
    },
  );

  it.each(ZONES)(
    "D21 an all-day event stays on its date after a zone change to %s",
    async (zone) => {
      await store.db.events.bulkPut([synced(NO_SCHOOL)]);

      expect(await idsOnDay("2026-10-15", zone)).toEqual([]);
      expect(await idsOnDay("2026-10-16", zone)).toEqual([NO_SCHOOL.id]);
      expect(await idsOnDay("2026-10-17", zone)).toEqual([]);
    },
  );

  it("D21 a timed event at a UTC midnight is read as timed, once", async () => {
    const midnight = timedAt(21, "2026-10-16T00:00:00.000Z");

    await store.db.events.bulkPut([synced(midnight), synced(NO_SCHOOL)]);

    expect(await idsOnDay("2026-10-16", "UTC")).toEqual([NO_SCHOOL.id, midnight.id]);
    expect(await idsOnDay("2026-10-15", "America/Los_Angeles")).toEqual([midnight.id]);
    expect(await idsOnDay("2026-10-16", "America/Los_Angeles")).toEqual([NO_SCHOOL.id]);
  });

  it.each(ZONES)("CAL-01 a week reads the all-day events of its own dates in %s", async (zone) => {
    await store.db.events.bulkPut([
      synced(SEPT_LAST),
      synced(FIRST),
      synced(NO_SCHOOL),
      synced(NOV_FIRST),
      { ...synced(GRANDPA), deletedAt: TEST_NOW.toISOString() },
    ]);

    const { result } = renderHook(() => useEventsInWeek("2026-09-27", zone), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() =>
      expect(result.current?.map((row) => row.id)).toEqual([SEPT_LAST.id, FIRST.id]),
    );
  });

  it.each(ZONES)(
    "AMB-03 the next event is the next day's all-day event, before its timed ones, in %s",
    async (zone) => {
      const tenth = timedAt(22, "2026-10-10T16:00:00.000Z");

      await store.db.events.bulkPut([synced(tenth), synced(allDay(15, "2026-10-10"))]);

      const { result } = renderHook(() => useNextEventAfter("2026-10-09", zone), {
        wrapper: wrapperFor(store),
      });

      await waitFor(() => expect(result.current?.title).toBe("All day 15"));
    },
  );

  it("AMB-03 a timed event on an earlier day comes before a later all-day event", async () => {
    const zone = "Pacific/Guam";

    const tenth = timedAt(22, "2026-10-10T02:00:00.000Z");

    await store.db.events.bulkPut([synced(tenth), synced(NO_SCHOOL)]);

    const { result } = renderHook(() => useNextEventAfter("2026-10-09", zone), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(tenth.id));
  });

  it("AMB-03 an all-day event on today's date is not after today in a zone ahead of UTC", async () => {
    await store.db.events.bulkPut([synced(GRANDPA), synced(NO_SCHOOL)]);

    const { result } = renderHook(() => useNextEventAfter("2026-10-09", "Pacific/Guam"), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(NO_SCHOOL.id));
  });

  it("LOC-09 the upcoming event example skips all-day events", async () => {
    await store.db.events.bulkPut([synced(NO_SCHOOL), synced(NEXT_MONTH)]);

    const { result } = renderHook(() => useUpcomingEvent(new Date(2026, 9, 9, 10, 41)), {
      wrapper: wrapperFor(store),
    });

    await waitFor(() => expect(result.current?.id).toBe(NEXT_MONTH.id));
  });
});
