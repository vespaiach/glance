import { todayHero } from "./todayHero";

const iso = (h: number, m: number) => new Date(2026, 9, 9, h, m).toISOString();
const at = (h: number, m: number) => new Date(2026, 9, 9, h, m);

const dropOff = { id: "drop-off", startAt: iso(9, 0), endAt: iso(9, 30) };
const call = { id: "call", startAt: iso(10, 30), endAt: iso(11, 15) };
const lunch = { id: "lunch", startAt: iso(12, 0), endAt: iso(13, 0) };
const garden = { id: "garden", startAt: iso(8, 0) };

const day = [lunch, call, dropOff];

describe("todayHero", () => {
  it("TODAY-02 a running event is happening now", () => {
    expect(todayHero(day, at(10, 41))).toEqual({ kind: "now", event: call });
  });

  it("TODAY-02 with nothing running the next event is up next", () => {
    expect(todayHero(day, at(9, 45))).toEqual({ kind: "next", event: call });
  });

  it("TODAY-02 once every event ended there is nothing else today", () => {
    expect(todayHero(day, at(13, 0))).toEqual({ kind: "ended" });
  });

  it("TODAY-02 a day with no events has nothing scheduled", () => {
    expect(todayHero([], at(10, 41))).toEqual({ kind: "none" });
  });

  it("TODAY-02 an event with no end stays happening now for the rest of the day", () => {
    expect(todayHero([garden], at(23, 59))).toEqual({ kind: "now", event: garden });
  });

  it("TODAY-02 of two running events the one that started last is shown", () => {
    expect(todayHero([garden, call], at(10, 41))).toEqual({ kind: "now", event: call });
  });

  it.each([
    [at(10, 29), "next"],
    [at(10, 30), "now"],
    [at(11, 14), "now"],
    [at(11, 15), "next"],
  ] as const)("TODAY-05 the hero swaps at each start and end (%s → %s)", (now, kind) => {
    expect(todayHero(day, now).kind).toBe(kind);
  });
});
