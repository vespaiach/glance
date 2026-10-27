import { comingUp, earlierFold, scheduleCount } from "./todaySchedule";
import { zonedInstant } from "./zone";

const tz = "America/Los_Angeles";

const october = (day: number, minutes: number) =>
  zonedInstant(tz, { year: 2026, month: 10, day }, minutes);

const NOW = october(9, 10 * 60 + 41);

const timed = (id: string, day: number, start: number, end?: number) => ({
  id,
  startAt: october(day, start).toISOString(),
  ...(end === undefined ? {} : { endAt: october(day, end).toISOString() }),
});

const allDay = (id: string, day: number) => ({
  id,
  startAt: `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  allDay: true as const,
});

const TODAY = [
  timed("drop-off", 9, 540, 570),
  timed("call", 9, 630, 675),
  timed("lunch", 9, 720, 780),
  allDay("grandpa", 9),
];

describe("scheduleCount", () => {
  test("TODAY-04 counts plans not yet ended plus all-day events as left", () => {
    expect(scheduleCount(TODAY, NOW, tz)).toEqual({ left: 3, total: 4 });
  });

  test("TODAY-04 a started plan with no end is still left", () => {
    expect(scheduleCount([timed("open", 9, 600)], NOW, tz)).toEqual({ left: 1, total: 1 });
  });

  test("TODAY-04 nothing is left once every timed plan has ended", () => {
    expect(scheduleCount(TODAY.slice(0, 3), october(9, 20 * 60), tz)).toEqual({
      left: 0,
      total: 3,
    });
  });
});

describe("earlierFold", () => {
  test("TODAY-11 the folded timeline starts at the current hour and counts ended plans", () => {
    expect(earlierFold(TODAY, NOW, tz)).toEqual({ done: 1, fromHour: 10, toHour: 21 });
  });

  test("TODAY-11 the fold starts no earlier than 5 AM", () => {
    expect(earlierFold(TODAY, october(9, 3 * 60), tz).fromHour).toBe(5);
  });

  test("TODAY-11 the fold starts no later than 8 PM", () => {
    expect(earlierFold(TODAY, october(9, 22 * 60 + 30), tz)).toEqual({
      done: 3,
      fromHour: 20,
      toHour: 24,
    });
  });

  test("TODAY-11 the timeline ends at 9 PM while that is at least 4 hours away", () => {
    expect(earlierFold(TODAY, october(9, 10 * 60), tz).toHour).toBe(21);
  });

  test("TODAY-11 from 6 PM the timeline runs 4 hours past its first hour", () => {
    expect(earlierFold(TODAY, october(9, 18 * 60), tz).toHour).toBe(22);
  });

  test("TODAY-11 at 8:30 PM the timeline runs to midnight", () => {
    expect(earlierFold(TODAY, october(9, 20 * 60 + 30), tz).toHour).toBe(24);
  });

  test("TODAY-11 the opened fold shows the whole day from 5 AM to 9 PM", () => {
    expect(earlierFold(TODAY, october(9, 20 * 60 + 30), tz, true)).toEqual({
      done: 3,
      fromHour: 5,
      toHour: 21,
    });
  });
});

describe("comingUp", () => {
  test("TODAY-06 lists the next 5 plans after today, never today's", () => {
    const events = [
      timed("today", 9, 1200, 1260),
      ...[10, 11, 12, 13, 14, 15].map((day) => timed(`d${day}`, day, 600, 660)),
    ];

    expect(comingUp(events, NOW, tz).map((event) => event.id)).toEqual([
      "d10",
      "d11",
      "d12",
      "d13",
      "d14",
    ]);
  });

  test("TODAY-06 orders by day, all-day plans first, then by start", () => {
    const events = [
      timed("late", 10, 900, 960),
      timed("early", 10, 480, 540),
      allDay("trip", 11),
      timed("morning", 11, 420, 480),
      allDay("birthday", 10),
    ];

    expect(comingUp(events, NOW, tz).map((event) => event.id)).toEqual([
      "birthday",
      "early",
      "late",
      "trip",
      "morning",
    ]);
  });
});
