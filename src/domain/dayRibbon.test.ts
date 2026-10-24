import { dayRibbon } from "./dayRibbon";
import { deviceTimeZone } from "./zone";

const tz = deviceTimeZone();

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);

const sunset = at(18, 42);

const call = { startAt: at(10, 30).toISOString(), endAt: at(11, 15).toISOString() };

describe("dayRibbon", () => {
  it("TODAY-13 at 5 AM nothing has elapsed", () => {
    expect(dayRibbon([], at(5), sunset, tz).elapsed).toBe(0);
  });

  it("TODAY-13 at noon 43.75 percent has elapsed", () => {
    expect(dayRibbon([], at(12), sunset, tz).elapsed).toBe(43.75);
  });

  it("TODAY-13 at 9 PM the whole ribbon has elapsed and no time is left", () => {
    const ribbon = dayRibbon([], at(21), sunset, tz);

    expect(ribbon.elapsed).toBe(100);
    expect(ribbon.left).toBe(0);
  });

  it("TODAY-13 the time left runs to 9 PM", () => {
    expect(dayRibbon([], at(20, 30), sunset, tz).left).toBe(30);
  });

  it("TODAY-13 the sunset tick sits at its place on the 5 AM to 9 PM scale", () => {
    expect(dayRibbon([], at(12), sunset, tz).sunset).toBeCloseTo(85.625, 3);
  });

  it("TODAY-13 after sunset the elapsed part passes the tick", () => {
    const ribbon = dayRibbon([], at(20, 43), sunset, tz);

    expect(ribbon.elapsed).toBeGreaterThan(ribbon.sunset ?? 100);
  });

  it.each([
    ["two hours before", at(16, 42)],
    ["just before", at(18, 30)],
    ["two hours after", at(20, 42)],
  ])("TODAY-13 the sunset tick is hidden %s sunset", (_name, now) => {
    expect(dayRibbon([], now, sunset, tz).sunset).toBeUndefined();
  });

  it("TODAY-13 the sunset tick shows a minute more than two hours away", () => {
    expect(dayRibbon([], at(16, 41), sunset, tz).sunset).toBeDefined();
    expect(dayRibbon([], at(20, 43), sunset, tz).sunset).toBeDefined();
  });

  it.each([
    ["10%", "start", at(6, 36)],
    ["20%", "center", at(8, 12)],
    ["50%", "center", at(13)],
    ["80%", "center", at(17, 48)],
    ["90%", "end", at(19, 24)],
  ] as const)(
    "TODAY-13 at %s of the ribbon the Now label is aligned to its %s",
    (_name, label, now) => {
      expect(dayRibbon([], now, sunset, tz).label).toBe(label);
    },
  );

  it("TODAY-13 without a forecast there is no sunset tick", () => {
    expect(dayRibbon([], at(12), undefined, tz).sunset).toBeUndefined();
  });

  it("TODAY-13 a sunset outside the ribbon has no tick", () => {
    expect(dayRibbon([], at(12), at(21, 30), tz).sunset).toBeUndefined();
  });

  it("TODAY-13 before 5 AM and after 9 PM the elapsed part stays within the ribbon", () => {
    expect(dayRibbon([], at(4), sunset, tz).elapsed).toBe(0);
    expect(dayRibbon([], at(22, 30), sunset, tz).elapsed).toBe(100);
    expect(dayRibbon([], at(22, 30), sunset, tz).left).toBe(0);
  });

  it("TODAY-13 each ended event is a segment from its start to its end", () => {
    const { ended } = dayRibbon([call], at(13), sunset, tz);

    expect(ended).toHaveLength(1);
    expect(ended[0]?.start).toBeCloseTo(34.375, 3);
    expect(ended[0]?.width).toBeCloseTo(4.6875, 3);
  });

  it("TODAY-13 a short ended event is drawn at least 20 minutes wide", () => {
    const quick = { startAt: at(9).toISOString(), endAt: at(9, 5).toISOString() };

    const { ended } = dayRibbon([quick], at(13), sunset, tz);

    expect(ended[0]?.width).toBeCloseTo(2.0833, 3);
  });

  it("TODAY-13 events that haven't ended, all-day events and untimed ones draw no segment", () => {
    const later = { startAt: at(15).toISOString(), endAt: at(16).toISOString() };

    const open = { startAt: at(8).toISOString() };

    const allDay = { startAt: at(0).toISOString(), allDay: true as const };

    expect(dayRibbon([later, open, allDay], at(13), sunset, tz).ended).toEqual([]);
  });

  it("TODAY-13 an ended event is cut to the ribbon", () => {
    const early = { startAt: at(4).toISOString(), endAt: at(6).toISOString() };

    const late = { startAt: at(20).toISOString(), endAt: at(22, 30).toISOString() };

    const { ended } = dayRibbon([early, late], at(23, 45), sunset, tz);

    expect(ended[0]).toEqual({ start: 0, width: 6.25 });
    expect(ended[1]?.start).toBeCloseTo(93.75, 3);
    expect(ended[1]?.width).toBeCloseTo(6.25, 3);
  });
});
