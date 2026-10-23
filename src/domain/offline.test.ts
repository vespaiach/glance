import { forecastStale, OFFLINE_PILL_DELAY_MS, offlinePillShown, savedTimeShown } from "./offline";

const since = new Date("2026-10-09T10:41:00");

const later = (ms: number) => new Date(since.getTime() + ms);

describe("offlinePillShown", () => {
  it("OFF-01 waits 30 s before showing the pill", () => {
    expect(OFFLINE_PILL_DELAY_MS).toBe(30_000);
    expect(offlinePillShown(since, later(29_999))).toBe(false);
    expect(offlinePillShown(since, later(30_000))).toBe(true);
  });

  it("OFF-01 is hidden while online", () => {
    expect(offlinePillShown(undefined, later(60_000))).toBe(false);
  });

  it("OFF-01 takes a shorter delay", () => {
    expect(offlinePillShown(since, since, 0)).toBe(true);
  });
});

describe("forecastStale", () => {
  it("OFF-03 a forecast is stale once it is more than an hour old", () => {
    const fetchedAt = since.toISOString();

    expect(forecastStale(fetchedAt, later(60 * 60_000))).toBe(false);
    expect(forecastStale(fetchedAt, later(60 * 60_000 + 1))).toBe(true);
  });
});

describe("savedTimeShown", () => {
  it.each([
    ["large", false, true],
    ["normal", false, true],
    ["small", false, false],
    ["large", true, false],
  ] as const)(
    "OFF-01 on %s (Weather: %s) the saved time shows: %s",
    (breakpoint, onWeather, shown) => {
      expect(savedTimeShown(breakpoint, onWeather)).toBe(shown);
    },
  );
});
