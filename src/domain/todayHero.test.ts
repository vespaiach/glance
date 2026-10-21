import { hasEvent, todayHero } from "./todayHero";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();
const at = (h: number, m: number) => new Date(2026, 9, 9, h, m);

const dropOff = { id: "drop-off", startAt: iso(9, 0), endAt: iso(9, 30) };
const call = { id: "call", startAt: iso(10, 30), endAt: iso(11, 15) };
const lunch = { id: "lunch", startAt: iso(12, 0), endAt: iso(13, 0) };
const garden = { id: "garden", startAt: iso(8, 0) };

const day = [lunch, call, dropOff];

const grandpa = { id: "grandpa", startAt: "2026-10-09T00:00:00.000Z", allDay: true as const };

describe("todayHero", () => {
  it("TODAY-02 a running event is happening now", () => {
    expect(todayHero(day, at(10, 41), tz)).toEqual({ kind: "now", event: call, left: 34 });
  });

  it("TODAY-02 with nothing running the next event is up next", () => {
    expect(todayHero(day, at(9, 45), tz)).toEqual({ kind: "next", event: call, in: 45 });
  });

  it("TODAY-02 once every event ended there is nothing else today", () => {
    expect(todayHero(day, at(13, 0), tz)).toEqual({ kind: "ended", done: 3 });
  });

  it("TODAY-02 the ended day counts the timed events that are done", () => {
    expect(todayHero([call], at(12, 0), tz)).toEqual({ kind: "ended", done: 1 });
  });

  it("TODAY-02 a day with no events has nothing scheduled", () => {
    expect(todayHero([], at(10, 41), tz)).toEqual({ kind: "none" });
  });

  it("TODAY-02 an event with no end stays happening now for the rest of the day", () => {
    expect(todayHero([garden], at(23, 59), tz)).toEqual({ kind: "now", event: garden });
  });

  it("TODAY-02 of two running events the one that started last is shown", () => {
    expect(todayHero([garden, call], at(10, 41), tz)).toEqual({
      kind: "now",
      event: call,
      left: 34,
    });
  });

  it("TODAY-02 of two running events that started together the shorter one is shown", () => {
    const quick = { id: "quick", startAt: iso(10, 30), endAt: iso(10, 50) };

    expect(todayHero([call, quick], at(10, 41), tz)).toEqual({
      kind: "now",
      event: quick,
      left: 9,
    });
  });

  it("TODAY-02 of two running events that started together one with an end beats one without", () => {
    const open = { id: "open", startAt: iso(10, 30) };

    expect(todayHero([call, open], at(10, 41), tz)).toEqual({ kind: "now", event: call, left: 34 });
  });

  it("TODAY-02 the countdown rounds part of a minute up", () => {
    const now = new Date(at(10, 41).getTime() + 30_000);

    expect(todayHero(day, now, tz)).toEqual({ kind: "now", event: call, left: 34 });
  });

  it("TODAY-02 the next event counts down to its start", () => {
    expect(todayHero(day, at(9, 10), tz)).toEqual({ kind: "now", event: dropOff, left: 20 });
    expect(todayHero(day, at(11, 15), tz)).toEqual({ kind: "next", event: lunch, in: 45 });
    expect(todayHero(day, at(8, 0), tz)).toEqual({ kind: "next", event: dropOff, in: 60 });
  });

  it.each([
    [at(10, 29), "next"],
    [at(10, 30), "now"],
    [at(11, 14), "now"],
    [at(11, 15), "next"],
  ] as const)("TODAY-05 the hero swaps at each start and end (%s → %s)", (now, kind) => {
    expect(todayHero(day, now, tz).kind).toBe(kind);
  });
});

describe("todayHero in a zone", () => {
  it("LOC-06 an open event from the day before in the given zone has ended", () => {
    const late = { id: "late", startAt: "2026-10-10T06:30:00Z" };

    expect(todayHero([late], new Date("2026-10-10T16:00:00Z"), "America/Los_Angeles")).toEqual({
      kind: "ended",
      done: 1,
    });
  });

  it("TODAY-02 a day with only all-day events has nothing scheduled", () => {
    expect(todayHero([grandpa], at(10, 41), tz)).toEqual({ kind: "none" });
  });

  it("TODAY-02 an all-day event never takes the hero from a running event", () => {
    expect(todayHero([grandpa, ...day], at(10, 41), tz)).toEqual({
      kind: "now",
      event: call,
      left: 34,
    });
  });

  it("TODAY-02 an all-day event is never up next", () => {
    expect(todayHero([grandpa, ...day], at(9, 45), tz)).toEqual({
      kind: "next",
      event: call,
      in: 45,
    });
  });

  it("TODAY-02 all-day events don't keep the day from ending", () => {
    expect(todayHero([grandpa, ...day], at(13, 0), tz)).toEqual({ kind: "ended", done: 3 });
  });
});

describe("hasEvent", () => {
  it("TODAY-02 running and upcoming heroes carry an event, open days don't", () => {
    expect(hasEvent(todayHero(day, at(10, 41), tz))).toBe(true);
    expect(hasEvent(todayHero(day, at(9, 45), tz))).toBe(true);
    expect(hasEvent(todayHero(day, at(13, 0), tz))).toBe(false);
    expect(hasEvent(todayHero([], at(10, 41), tz))).toBe(false);
  });
});
