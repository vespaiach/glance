import { ambientDim, isTomorrow } from "./ambient";

const now = new Date(2026, 9, 9, 19, 12);

describe("ambientDim", () => {
  it("AMB-06 dims the photo at least 0.55 whatever the setting", () => {
    expect([0, 0.2, 0.4].map(ambientDim)).toEqual([0.55, 0.55, 0.55]);
  });

  it("AMB-06 keeps a stronger dim", () => {
    expect(ambientDim(0.7)).toBe(0.7);
  });
});

describe("isTomorrow", () => {
  it("AMB-03 is true for any time on the next local day", () => {
    expect(isTomorrow(new Date(2026, 9, 10, 0, 0), now)).toBe(true);
    expect(isTomorrow(new Date(2026, 9, 10, 23, 59), now)).toBe(true);
  });

  it("AMB-03 is false for later days", () => {
    expect(isTomorrow(new Date(2026, 9, 11, 9, 0), now)).toBe(false);
  });

  it("AMB-03 crosses a month end", () => {
    expect(isTomorrow(new Date(2026, 10, 1, 9, 0), new Date(2026, 9, 31, 22, 0))).toBe(true);
  });
});
