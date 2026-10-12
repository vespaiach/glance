import { OFFLINE_PILL_DELAY_MS, offlinePillShown } from "./offline";

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
