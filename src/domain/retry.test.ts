import { retryDelayMs } from "./retry";

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
