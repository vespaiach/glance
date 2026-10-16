import { todaySchedule } from "./todaySchedule";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();

const NOW = new Date(2026, 9, 9, 10, 41);

const event = (id: string, start: [number, number], end: [number, number]) => ({
  id,
  startAt: iso(...start),
  endAt: iso(...end),
});

const dropOff = event("drop-off", [9, 0], [9, 30]);
const call = event("call", [10, 30], [11, 15]);
const lunch = event("lunch", [12, 0], [13, 0]);
const dentist = event("dentist", [14, 0], [14, 20]);
const soccer = event("soccer", [15, 30], [16, 30]);
const grocery = event("grocery", [17, 0], [17, 30]);
const dinner = event("dinner", [18, 0], [19, 0]);
const piano = event("piano", [19, 30], [20, 0]);
const story = event("story", [20, 30], [21, 0]);

const MANY = [dropOff, call, lunch, dentist, soccer, grocery, dinner, piano, story];

const grandpa = { id: "grandpa", startAt: "2026-10-09T00:00:00.000Z", allDay: true as const };

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

describe("todaySchedule", () => {
  it("TODAY-11 shows every row and hides nothing when they all fit", () => {
    const schedule = todaySchedule([lunch, dropOff, call], NOW, tz, 4);

    expect(ids(schedule.rows)).toEqual(["drop-off", "call", "lunch"]);
    expect(schedule.hidden).toEqual({ earlier: 0, later: 0 });
  });

  it("TODAY-11 rows that exactly fill the places need no button", () => {
    const schedule = todaySchedule(MANY.slice(0, 4), NOW, tz, 4);

    expect(schedule.rows).toHaveLength(4);
    expect(schedule.hidden).toEqual({ earlier: 0, later: 0 });
  });

  it("TODAY-11 the button takes one place, ended rows hide first, then the latest upcoming", () => {
    const schedule = todaySchedule(MANY, NOW, tz, 8);

    expect(ids(schedule.rows)).toEqual([
      "call",
      "lunch",
      "dentist",
      "soccer",
      "grocery",
      "dinner",
      "piano",
    ]);
    expect(schedule.hidden).toEqual({ earlier: 1, later: 1 });
  });

  it("TODAY-11 with few places only now and the next upcoming rows stay", () => {
    const schedule = todaySchedule(MANY, NOW, tz, 4);

    expect(ids(schedule.rows)).toEqual(["call", "lunch", "dentist"]);
    expect(schedule.hidden).toEqual({ earlier: 1, later: 5 });
  });

  it("TODAY-11 places left after the upcoming rows keep the latest ended rows", () => {
    const schedule = todaySchedule(MANY, new Date(2026, 9, 9, 19, 45), tz, 5);

    expect(ids(schedule.rows)).toEqual(["grocery", "dinner", "piano", "story"]);
    expect(schedule.hidden).toEqual({ earlier: 5, later: 0 });
  });

  it("TODAY-11 happening now and the next event stay even beyond the places", () => {
    const garden = { id: "garden", startAt: iso(8, 0) };
    const games = { id: "games", startAt: iso(10, 0), endAt: iso(12, 0) };

    const schedule = todaySchedule([garden, games, ...MANY], NOW, tz, 4);

    expect(ids(schedule.rows)).toEqual(["garden", "games", "call", "lunch"]);
    expect(schedule.hidden).toEqual({ earlier: 1, later: 6 });
  });

  it("TODAY-12 all-day events are kept apart and never hidden", () => {
    const schedule = todaySchedule([grandpa, ...MANY], NOW, tz, 4);

    expect(ids(schedule.allDay)).toEqual(["grandpa"]);
    expect(ids(schedule.rows)).not.toContain("grandpa");
    expect(schedule.hidden).toEqual({ earlier: 1, later: 5 });
  });
});
