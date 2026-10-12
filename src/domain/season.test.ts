import { seasonFor } from "./season";

describe("seasonFor", () => {
  it.each([
    [0, "winter"],
    [1, "winter"],
    [2, "spring"],
    [4, "spring"],
    [5, "summer"],
    [7, "summer"],
    [8, "fall"],
    [10, "fall"],
    [11, "winter"],
  ] as const)("SET-02 Auto maps month index %i to %s", (month, expected) => {
    expect(seasonFor("auto", new Date(2026, month, 15))).toBe(expected);
  });

  it("SET-02 a picked season wins over the date", () => {
    expect(seasonFor("summer", new Date(2026, 11, 25))).toBe("summer");
  });
});
