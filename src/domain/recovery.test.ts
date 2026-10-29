import { recentCrashes, reloadDue } from "./recovery";

describe("reloadDue", () => {
  it("FAIL-05 a page is due a reload from 24 h after it loaded", () => {
    const loadedAt = new Date("2026-10-09T10:41:00Z");

    expect(reloadDue(loadedAt, new Date("2026-10-10T10:40:59Z"))).toBe(false);
    expect(reloadDue(loadedAt, new Date("2026-10-10T10:41:00Z"))).toBe(true);
  });
});

describe("recentCrashes", () => {
  it("FAIL-04 keeps only the crashes of the last 10 minutes", () => {
    const crashes = ["2026-10-09T10:31:00.000Z", "2026-10-09T10:31:01.000Z"];

    expect(recentCrashes(crashes, new Date("2026-10-09T10:41:00Z"))).toEqual([
      "2026-10-09T10:31:01.000Z",
    ]);
  });
});
