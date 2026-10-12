import { retryDelayMs, retryMinutes } from "./retry";

const MINUTE = 60_000;

describe("retryDelayMs", () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 5],
  ])("FAIL-03 waits after failure %i for %i min", (failures, minutes) => {
    expect(retryDelayMs(failures)).toBe(minutes * MINUTE);
  });

  it.each([4, 5, 12])("FAIL-03 keeps waiting 5 min after failure %i", (failures) => {
    expect(retryDelayMs(failures)).toBe(5 * MINUTE);
  });
});

describe("retryMinutes", () => {
  const now = new Date(2026, 9, 9, 10, 41);

  it("FAIL-03 rounds the wait up to whole minutes", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 42, 30).toISOString(), now)).toBe(2);
  });

  it("FAIL-03 is 1 min for a retry less than a minute away", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 41, 10).toISOString(), now)).toBe(1);
  });

  it("FAIL-03 is 1 min for a retry already due", () => {
    expect(retryMinutes(new Date(2026, 9, 9, 10, 40).toISOString(), now)).toBe(1);
  });

  it("FAIL-03 is 1 min, the first retry, when no retry is scheduled yet", () => {
    expect(retryMinutes(undefined, now)).toBe(1);
  });
});
